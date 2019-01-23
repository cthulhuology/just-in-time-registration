const _ = require('lodash');

/**
 * A mapping between X.509 standard attributes and
 * human readable identifiers.
 */
const mapping = {
  'T': 'device_type',
  'C': 'country',
  'E': 'email_address',
  'OU': 'organizational_unit',
  'O': 'organization',
  'L': 'locality',
  'ST': 'state',
  'CN': 'common_name',
  'GN': 'given_name',
  'DN': 'distinguished_name',
  'SN': 'surname',
  'postalCode': 'postal_code',
  'STREET': 'street',
  '2.5.4.14': 'search_guide',
  '2.5.4.44': 'product_id',
  '2.5.4.18': 'post_office_box',
  '2.5.4.20': 'phone_number',
  '2.5.4.31': 'member',
  '2.5.4.30': 'supported_application_context',
  '2.5.4.32': 'owner',
  '2.5.4.43': 'initials',
  '2.5.4.48': 'protocol_information',
  '2.5.4.65': 'pseudonym',
  '2.5.4.51': 'house_identifier',
  'businessCategory': 'business_category',
  'serialNumber': 'serial_number'
};

/**
 * Transforms the keys associated with the given
 * object in order to normalize them from X.509
 * standard attributes to human-readable attributes.
 * @param {*} attrs an X.509 attributes object.
 */
const normalize = (attrs) => _.mapKeys(attrs, (_1, key) => mapping[key] || key);

module.exports = { mapping, normalize };