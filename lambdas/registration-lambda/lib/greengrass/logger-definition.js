const UUID = require('uuid-1345');

/**
 * Default logger definition for a Greengrass
 * provisioning.
 */
module.exports = [{
  'Id': UUID.v4(),
  'Component': 'Lambda',
  'Level': 'DEBUG',
  'Type': 'AWSCloudWatch'
}, {
  'Id': UUID.v4(),
  'Component': 'GreengrassSystem',
  'Level': 'DEBUG',
  'Type': 'AWSCloudWatch'
}, {
  'Id': UUID.v4(),
  'Component': 'Lambda',
  'Level': 'DEBUG',
  'Space': 10240,
  'Type': 'FileSystem'
}, {
  'Id': UUID.v4(),
  'Component': 'GreengrassSystem',
  'Level': 'DEBUG',
  'Space': 10240,
  'Type': 'FileSystem'
}];