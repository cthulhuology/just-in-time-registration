const _                = require('lodash');
const AWS              = require('aws-sdk');
const loggerDefinition = require('./logger-definition');

/**
 * Creates a new logger definition to be used
 * by new Greengrass Groups.
 */
const createLoggerDefinition = () => {
  return new Promise((resolve, reject) => {
    new AWS.Greengrass().createLoggerDefinition({
      InitialVersion: {
        Loggers: loggerDefinition
      }
    }, (err, data) => (err ? reject(err) : resolve(data.LatestVersionArn)))
  });
};

/**
 * Creates a new Greengrass core definition.
 * @param {*} thingArn the ARN of the thing to associate with the
 * core definition.
 * @param {*} certificateArn the ARN of the certificate associated
 * with the thing.
 */
const createCoreDefinition = (thing, certificateArn) => {
  return new Promise((resolve, reject) => {
    new AWS.Greengrass().createCoreDefinition({
      InitialVersion: {
        Cores: [{
          CertificateArn: certificateArn,
          Id: thing.thingName,
          SyncShadow: true,
          ThingArn: thing.thingArn
        }]
      },
      Name: thing.thingArn
    }, (err, data) => (err ? reject(err) : resolve(data.LatestVersionArn)));
  });
};

/**
 * Creates a new Greengrass group definition.
 * @param {*} name the thing name.
 * @param {*} core the ARN of the core to associate.
 * @param {*} loggers the ARN of the loggers to associate.
 */
const createGroupDefinition = (name, coreArn, loggerArn) => {
  return new Promise((resolve, reject) => {
    new AWS.Greengrass().createGroup({
      InitialVersion: {
        CoreDefinitionVersionArn: coreArn,
        LoggerDefinitionVersionArn: loggerArn
      },
      Name: name
    }, (err, data) => (err ? reject(err) : resolve(data)));
  });
};

/**
 * Associates the given `role` to the given `group`.
 * @param {*} roleArn the ARN of the role to associate with the `group`.
 * @param {*} groupId the group identifier to associate the `role` with.
 */
const associateRoleToGroup = (roleArn, groupId) => {
  return new Promise((resolve, reject) => {
    new AWS.Greengrass().associateRoleToGroup({
      RoleArn: roleArn,
      GroupId: groupId 
    }, (err, data) => (err ? reject(err) : resolve(data)));
  });
};

/**
 * Provisions a new Greengrass Core and Group if the
 * given device is a `greengrass` device.
 */
module.exports.provision = (thing, certificate) => {
  if (certificate.attributes.subject.T !== 'greengrass') {
    // The device is not a `greengrass` device.
    return (Promise.resolve());
  }
  // The name of the Greengrass group.
  const group   = _.template(process.env.GreengrassGroupName)({ certificate });
  // The resource description of the created definitions.
  const results = {};
  // Starting by verifying whether a Greengrass service role exists on the current account.
  return (createCoreDefinition(thing, certificate.certificateDescription.certificateArn)
    // Storing the core ARN.
    .then((coreArn) => results.coreArn = coreArn)
    // Creating a new Greengrass Logger definition.
    .then(() => createLoggerDefinition())
    // Storing the logger ARN.
    .then((loggerArn) => results.loggerArn = loggerArn)
    // Creating a new Greengrass Group definition.
    .then(() => createGroupDefinition(group, results.coreArn, results.loggerArn))
    // Storing the group ARN.
    .then((group) => results.group = group)
    // Associating the service role with the group.
    .then(() => associateRoleToGroup(process.env.GreengrassServiceRole, results.group.Id))
    // Returning the `results` object.
    .then(() => results)
  );
};