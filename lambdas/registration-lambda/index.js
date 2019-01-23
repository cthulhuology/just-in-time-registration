const _      = require('lodash');
const Joi    = require('joi');
const AWS    = require('aws-sdk');
const ASN    = require('jsrsasign');
const policy = require('./lib/policies/policy-generator');
const attrs  = require('./lib/x509-mapping');
const green  = require('./lib/greengrass/greengrass-provisioner');
const logger = require('./lib/logger');

// Configuring the AWS SDK with the current region.
AWS.config.update({ region: process.env.AWS_REGION });

// Creating a new `iot` client.
const iot = new AWS.Iot();

/**
 * The validation schema for validating the certificate
 * subject attributes.
 */
const schema = Joi.object().keys({
  serialNumber: Joi.string().required(),
  T: Joi.string().valid(['greengrass', 'iot']).required(),
  '2.5.4.44': Joi.string().required()
}).unknown().required();

/**
 * @return the description of the certificate
 * associated with the given `id`.
 * @param {*} id the certificate identifier.
 */
const describeCertificate = (id) => {
  return new Promise((resolve, reject) => {
    iot.describeCertificate({
      certificateId: id
    }, (err, data) => err ? reject(err) : resolve(data));
  });
};

/**
 * Transitions the given `certificate` to the
 * `active` state.
 * @param {*} certificate the certificate to activate.
 */
const activateCertificate = (certificate) => {
  return new Promise((resolve, reject) => {
    iot.updateCertificate({
      certificateId: certificate.certificateDescription.certificateId,
      newStatus: 'ACTIVE'
    }, (err, data) => err ? reject(err) : resolve(data));
  });
};

/**
 * Creates a thing type associated with the configured
 * searchable attributes.
 */
const createThingType = (certificate) => {
  // Evaluating the name of the thing type given its parameterized value.
  const name = _.template(process.env.ThingTypeName)({ certificate });
  // Creating the thing type on AWS IoT.
  return new Promise((resolve, reject) => {
    iot.createThingType({
      thingTypeName: name,
      thingTypeProperties: {
        searchableAttributes: [
          'serial_number',
          'product_id',
          'device_type'
        ]
      }
    }, (err, data) => {
      if (err && err.code !== 'ResourceAlreadyExistsException') {
        return (reject(err));
      }
      resolve(data);
    });
  });
};

/**
 * Creates a thing associated with the new device.
 * @param {*} certificate the device certificate description.
 */
const createThing = (certificate) => {
  // Evaluating the name of the thing type given its parameterized value.
  const type = _.template(process.env.ThingTypeName)({ certificate });
  // Evaluating the name of the thing given its parameterized value.
  const name = _.template(process.env.ThingName)({ certificate });
  // Creating the thing on AWS IoT.
  return new Promise((resolve, reject) => {
    const opts = {
      thingName: name,
      thingTypeName: type,
      attributePayload: {
        attributes: attrs.normalize(certificate.attributes.subject)
      }
    };
    // Creating the thing.
    iot.createThing(opts, (err, data) => {
      if (err && err.code !== 'ResourceAlreadyExistsException') {
        return (reject(err));
      }
      resolve(data);
    });
  });
};

/**
 * Creates a new device policy associated with the
 * given `certificate` and its `subject` fields.
 * @param {*} certificate the device certificate.
 * @param {*} subject the certificate subject field.
 */
const createPolicy = (certificate) => {
  // Evaluating the policy name given the device type.
  const policyName = certificate.attributes.subject.T === 'greengrass' ?
    process.env.GreengrassPolicyName : process.env.DevicePolicyName;
  // The evaluated policy name.
  const name = _.template(policyName)({ certificate });
  // The device policy template.
  const devicePolicy = policy(certificate);
  // Creating the policy on AWS IoT.
  return new Promise((resolve, reject) => {
    iot.createPolicy({
      policyName: name,
      policyDocument: JSON.stringify(devicePolicy)
    }, (err, data) => {
      if (err && err.code === 'ResourceAlreadyExistsException') {
        return (resolve({ policyName: name }));
      } else if (err) {
        return (reject(err));
      }
      resolve(data);
    });
  });
};

/**
 * Attaches the given `certificate` to the given
 * `thing`.
 * @param {*} certificate the certificate to activate.
 * @param {*} thingName the name of the thing to attach.
 */
const attachThingPrincipal = (certificate, thingName) => {
  return new Promise((resolve, reject) => {
    iot.attachThingPrincipal({
      thingName: thingName,
      principal: certificate.certificateDescription.certificateArn
    }, (err, data) => err ? reject(err) : resolve(data));
  });
};

/**
 * Attaches the given `certificate` to the given
 * `policy`.
 * @param {*} certificate the device certificate.
 * @param {*} policy the policy to attach the certificate to.
 */
const attachPrincipalPolicy = (certificate, policy) => {
  return new Promise((resolve, reject) => {
    iot.attachPrincipalPolicy({
      policyName: policy.policyName,
      principal: certificate.certificateDescription.certificateArn
    }, (err, data) => err ? reject(err) : resolve(data));
  });
};

/**
 * @return an associative object containing the
 * issuer field of the given PEM certificate.
 */
const getIssuerField = (certificate) => {
  // The object to return.
  const object = {};
  // The subject string extracted from the certificate.
  const subject = certificate.getIssuerString();
  // Filtering out empty values.
  subject.split('/').filter((n) => n !== '').forEach((entry) => {
    const pair = entry.split('=');
    object[pair[0]] = pair[1];
  });
  return (object);
};

/**
 * @return an associative object containing the
 * subject field of the given PEM certificate.
 */
const getSubjectField = (certificate) => {
  // The object to return.
  const object = {};
  // The subject string extracted from the certificate.
  const subject = certificate.getSubjectString();
  // Filtering out empty values.
  subject.split('/').filter((n) => n !== '').forEach((entry) => {
    const pair = entry.split('=');
    object[pair[0]] = pair[1];
  });
  return (object);
};

/**
 * Invokes the given interceptor lambda if it
 * is defined and interrupts the provisionning
 * process if the lambda function rejects
 * process.
 * @param {*} name the name of the interceptor
 * lambda function to invoke.
 * @param {*} certificate the certificate object
 * to forward to the interceptor lambda.
 */
const invokeInterceptor = (name, certificate) => {
  const getMessage = (data) => {
    const payload = data.Payload || 'Unspecified interceptor error';
    try {
      // Trying to parse the result as JSON.
      return (JSON.parse(payload));
    } catch (e) {
      // If it failed, we simply return the initial payload.
      return (payload);
    }
  }
  if (_.isEmpty(name)) {
    // If no interceptor is defined, we resolve.
    return (Promise.resolve());
  }
  // Executing the interceptor lambda function.
  return new Promise((resolve, reject) => {
    new AWS.Lambda().invoke({
      FunctionName: name,
      Payload: JSON.stringify(certificate)
    }, (err, data) => {
      if (err) {
        // If an error occured, we reject the execution.
        return (reject(err));
      }
      return (data.FunctionError ? reject(getMessage(data)) : resolve());
    });
  });
};

/**
 * Initiates the provisioning chain and resolves or rejects
 * the returned promise based on the result of the provisioning
 * process.
 * @return a promise resolved when the provisioning process has
 * been successful.
 * @param {*} event the certificate registration event sent by
 * AWS IoT.
 * @param {*} certificate the certificate object.
 */
const provision = (event, certificate) => {
  // The description of the created thing.
  let thing = null;
  // Retrieving information about the certificate getting registered.
  return Promise.resolve().then(() => {
    // Storing the `awsAccountId` in the certificate.
    certificate.awsAccountId = event.awsAccountId;
    // Creating a new X.509 certificate.
    const x509 = new ASN.X509();
    // Loading the certificate content.
    x509.readCertPEM(certificate.certificateDescription.certificatePem);
    // Storing the certificate attributes.
    certificate.attributes = {
      // The certificate's subject attributes.
      subject: getSubjectField(x509),
      // The certificate's issuer attributes.
      issuer: getIssuerField(x509)
    };
    // Validating the certificate attributes.
    const error = Joi.validate(certificate.attributes.subject, schema).error;
    if (error) {
      return (Promise.reject(error));
    }
    // Invoking the interceptor lambda if available.
    return (invokeInterceptor(process.env.InterceptorLambda));
  })
  // Creating the IoT policy associated with the device.
  .then(() => createPolicy(certificate))
  // Attaching the certificate to the created policy.
  .then((policy) => attachPrincipalPolicy(certificate, policy))
  // Creating the thing type associated with the device.
  .then(() => createThingType(certificate))
  // Creating the thing associated with the device.
  .then(() => createThing(certificate))
  // Saving the created thing description.
  .then((description) => thing = description)
  // Attaching the certificate to the created thing.
  .then(() => attachThingPrincipal(certificate, thing.thingName))
  // Provisions a new Greengrass Core if the devide type matches.
  .then(() => green.provision(thing, certificate))
  // Transitions the certificate into the `active` state.
  .then(() => activateCertificate(certificate))
  // Logging the event to the activated output providers.
  .then(() => logger.log(thing, event.certificateId, certificate, logger.SUCCESS));
};

/**
 * Handles certificate registration events, and only executes
 * the provisioning chain if the certificate is not `active`.
 * @param {*} event the certificate registration event sent by
 * AWS IoT.
 * @return a promise resolved when the provisioning process has
 * been successful.
 */
const processEvent = (event) => {
  // Verifying whether the certificate has been already made `active`
  // by a previous invocation of the function.
  return (describeCertificate(event.certificateId).then((certificate) => {
    if (certificate.certificateDescription.status === 'ACTIVE') {
      // The certificate is already `active`, resolving the promise.
      return (Promise.resolve());
    }
    // Otherwise start the provisioning chain.
    return (provision(event, certificate));
  }));
};

/**
 * Lambda function entry point.
 */
exports.handler = (event, context, callback) => {
  // Parsing the body of the messages.
  const records = _(event.Records)
    // Parsing the body of the record.
    .map((record) => {
      record.body = JSON.parse(record.body);
      return (record);
    })
    // De-duplicating the records by `certificateId`.
    .uniqBy((record) => record.body.certificateId)
    // Retrieving the processed value.
    .value();
  // Processing all the requests in batch.
  Promise.all(records.map((record) => processEvent(record.body)))
    // Returning a response to the caller.
    .then((data) => callback(null, data))
    // Gracefully logging errors.
    .catch((err) => {
      // Redirecting the error to the logger.
      logger.log(thing, event.certificateId, certificate, logger.FAILURE, err)
        .then(() => callback(err));
    });;
  
};