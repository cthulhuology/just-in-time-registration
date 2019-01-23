const iotPolicy        = require('./iot-policy');
const greengrassPolicy = require('./greengrass-policy');

/**
 * Retrieves the IoT policies for AWS Greengrass.
 * @param {*} certificate a reference to the certificate object.
 */
const getGreengrassPolicy = (policies) => {
  const policy = greengrassPolicy();
  // Adding `iot:Subscribe` resources.
  policies.greengrass.subscribe.forEach((resource) => {
    policy.Statement[1].Resource.push(
      `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AccountId}:topicfilter/${resource}`
    );
  });
  // Adding `iot:Receive` resources.
  policies.greengrass.receive.forEach((resource) => {
    policy.Statement[2].Resource.push(
      `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AccountId}:topic/${resource}`
    );
  });
  // Adding `iot:Publish` resources.
  policies.greengrass.publish.forEach((resource) => {
    policy.Statement[3].Resource.push(
      `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AccountId}:topic/${resource}`
    );
  });
  return (policy);
};

/**
 * Retrieves the IoT policies for an IoT device.
 * @param {*} certificate a reference to the certificate object.
 */
const getIotPolicy = (policies) => {
  const policy = iotPolicy();
  // Adding `iot:Subscribe` resources.
  policies.iot.subscribe.forEach((resource) => {
    policy.Statement[1].Resource.push(
      `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AccountId}:topicfilter/${resource}`
    );
  });
  // Adding `iot:Receive` resources.
  policies.iot.receive.forEach((resource) => {
    policy.Statement[2].Resource.push(
      `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AccountId}:topic/${resource}`
    );
  });
  // Adding `iot:Publish` resources.
  policies.iot.publish.forEach((resource) => {
    policy.Statement[3].Resource.push(
      `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AccountId}:topic/${resource}`
    );
  });
  return (policy);
};

/**
 * Creates the appropriate policy given the device type.
 */
module.exports = (certificate) => {
  const policies = { iot: {}, greengrass: {} };
  // Gathering policies for IoT devices.
  policies.iot.subscribe = process.env.DeviceSubscribePolicy.split(',');
  policies.iot.receive = process.env.DeviceReceivePolicy.split(',');
  policies.iot.publish = process.env.DevicePublishPolicy.split(',');
  // Gathering policies for Greengrass devices.
  policies.greengrass.subscribe = process.env.GreengrassSubscribePolicy.split(',');
  policies.greengrass.receive = process.env.GreengrassReceivePolicy.split(',');
  policies.greengrass.publish = process.env.GreengrassPublishPolicy.split(',');
  // Generating an IoT policy based on the device type.
  return (certificate.attributes.subject.T === 'greengrass' ?
    getGreengrassPolicy(policies) : getIotPolicy(policies)
  );
};
