/**
 * The policy object for Greengrass to provision.
 */
module.exports = () => ({
  'Version': '2012-10-17',
  'Statement': [

    /**
     * Authorize Greengrass devices to connect to the AWS IoT
     * broker using its client identifier.
     */
    {
      'Effect': 'Allow',
      'Action': [
        'iot:Connect'
      ],
      'Resource': [
        '*'
      ]
    },

    /**
     * Authorize Greengrass devices to subscribe to AWS IoT.
     */
    {
      'Effect': 'Allow',
      'Action': [
        'iot:Subscribe'
      ],
      'Resource': [
        `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AccountId}:topicfilter/$aws/things/` + '${iot:Certificate.Subject.CommonName}-gda/*',
        `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AccountId}:topicfilter/$aws/things/` + '${iot:Certificate.Subject.CommonName}-gcm/*',
        `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AccountId}:topicfilter/$aws/things/` + '${iot:Certificate.Subject.CommonName}-gci/*'
      ]
    },

    /**
     * Authorize Greengrass devices to receive messages from AWS IoT.
     */
    {
      'Effect': 'Allow',
      'Action': [
        'iot:Receive'
      ],
      'Resource': [
        `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AccountId}:topic/$aws/things/` + '${iot:Certificate.Subject.CommonName}-gda/*',
        `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AccountId}:topic/$aws/things/` + '${iot:Certificate.Subject.CommonName}-gcm/*',
        `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AccountId}:topic/$aws/things/` + '${iot:Certificate.Subject.CommonName}-gci/*'
      ]
    },

    /**
     * Authorize Greengrass devices to publish messages to AWS IoT.
     */
    {
      'Effect': 'Allow',
      'Action': [
        'iot:Publish'
      ],
      'Resource': [
        `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AccountId}:topic/$aws/things/` + '${iot:Certificate.Subject.CommonName}-gda/*',
        `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AccountId}:topic/$aws/things/` + '${iot:Certificate.Subject.CommonName}-gcm/*',
        `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AccountId}:topic/$aws/things/` + '${iot:Certificate.Subject.CommonName}-gci/*'
      ]
    },

      /**
     * Authorize Greengrass API calls to AWS IoT.
     */
    {
      'Effect': 'Allow',
      'Action': [
        'greengrass:*'
      ],
      'Resource': [
        "*"
      ]
    }
  ]
});