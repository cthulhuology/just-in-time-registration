module.exports = (e) => ({
  'Version': '2012-10-17',
  'Statement': [
    
    /**
     * Authorize the thing to connect to the AWS IoT
     * broker using its client identifier.
     */
    {
        'Effect': 'Allow',
        'Action': [
            'iot:Connect'
        ],
        'Resource': [
            `arn:aws:iot:${process.env.AWS_REGION}:${e.awsAccountId}:client/` + '${iot:Certificate.Subject.SerialNumber}'
        ]
    },

    /**
     * Authorize the thing to publish and receive messages from
     * its dedicated topic, and its thing shadow topics.
     */
    {
        'Effect': 'Allow',
        'Action': [
            'iot:Publish',
            'iot:Receive'
        ],
        'Resource': [
            `arn:aws:iot:${process.env.AWS_REGION}:${e.awsAccountId}:topic/device/` + '${iot:Certificate.Subject.SerialNumber}',
            `arn:aws:iot:${process.env.AWS_REGION}:${e.awsAccountId}:topic/device/` + '${iot:Certificate.Subject.SerialNumber}/*',
            `arn:aws:iot:${process.env.AWS_REGION}:${e.awsAccountId}:topic/$aws/things/` + '${iot:Connection.Thing.ThingName}/shadow/*'
        ]
    },

    /**
     * Authorize the thing to subscribe to its dedicated topic,
     * and its thing shadow topics.
     */
    {
        'Effect': 'Allow',
        'Action': [
            'iot:Subscribe'
        ],
        'Resource': [
            `arn:aws:iot:${process.env.AWS_REGION}:${e.awsAccountId}:topicfilter/device/` + '${iot:Certificate.Subject.SerialNumber}',
            `arn:aws:iot:${process.env.AWS_REGION}:${e.awsAccountId}:topicfilter/device/` + '${iot:Certificate.Subject.SerialNumber}/*',
            `arn:aws:iot:${process.env.AWS_REGION}:${e.awsAccountId}:topicfilter/$aws/things/` + '${iot:Connection.Thing.ThingName}/shadow/*'
        ]
    },

    /**
     * Authorize the thing to retrieve and update its associated
     * thing shadow document.
     */
    {
        'Effect': 'Allow',
        'Action': [
            'iot:UpdateThingShadow',
            'iot:GetThingShadow'
        ],
        'Resource': [
            `arn:aws:iot:${process.env.AWS_REGION}:${e.awsAccountId}:topic/$aws/things/` + '${iot:Connection.Thing.ThingName}/shadow/*'
        ]
    }
  ]
});