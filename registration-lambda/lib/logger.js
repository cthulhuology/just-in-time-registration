const AWS = require('aws-sdk');

/**
 * Identifies the provisioning outcomes.
 */
const SUCCESS = 'SUCCESS';
const FAILURE = 'FAILURE';

/**
 * Logs the given `event` to DynamoDB.
 * @param {*} event the event to log.
 */
const logToDynamoDb = (event) => {
  if (!process.env.LoggingTable) {
    // DynamoDB logging is disabled.
    return (Promise.resolve());
  }
  return new Promise((resolve) => {
    new AWS.DynamoDB.DocumentClient().put({ 
      TableName: process.env.LoggingTable,
      Item: event
    }, (err) => resolve(err ? console.log(err) : 0));
  });
};

/**
 * Logs the given `event` to an AWS SQS queue.
 * @param {*} event the event to log.
 */
const logToSqs = (event) => {
  if (!process.env.SqsQueue) {
    // SQS logging is disabled.
    return (Promise.resolve());
  }
  return new Promise((resolve) => {
    new AWS.SQS().sendMessage({
      MessageBody: JSON.stringify(event),
      QueueUrl: process.env.SqsQueue
     }, (err) => resolve(err ? console.log(err) : 0));
  });
};

/**
 * Logs the current provisioning event to the enabled output
 * providers (e.g DynamoDB, SQS).
 * @param {*} thing the created thing.
 * @param {*} certificateId the thing certificate identifier.
 * @param {*} certificate the thing certificate object.
 * @param {*} type whether the provisioning was successful.
 * @param {*} error an optional error message to associate with the logs.
 */
const log = (thing, certificateId, certificate, type, error) => {
  const event = { certificateId, thingName: thing ? thing.thingName : undefined, type, error };

  // Adding the current timestamp.
  event.timestamp = Date.now();
  // If the certificate has been parsed, we extract its
  // associated values.
  if (certificate) {
    // The evaluated device category.
    event.thingCategory = certificate.attributes.subject.T;
    // The evaluated serial number.
    event.serialNumber = certificate.attributes.subject.serialNumber;
    // The evaluated product identifier.
    event.productId = certificate.attributes.subject['2.5.4.44'];
  }
  return (Promise.all([logToDynamoDb(event), logToSqs(event)]));
};

module.exports = { log, SUCCESS, FAILURE };