#!/bin/bash

# Stopping the script when a command's exit code signals a failure.
set -e 
set -o pipefail

CACERT_NAME='my-ca-certificate'
CERTIFICATE_NAME='my-device-certificate'
CERTIFICATE_AND_CACERT_NAME='device-and-ca-certificate.crt'
ROOT_CERT_URL='https://www.amazontrust.com/repository/AmazonRootCA1.pem'
ROOT_CERT_NAME='aws-root-cert.pem'
OPENSSL_CONFIG='./config/openssl-device.conf'

# Retrieving arguments from the command-line.
while getopts ":c:n:d:r:o:" o; do
    case "${o}" in
        c) CACERT_NAME=${OPTARG} ;;
        n) CERTIFICATE_NAME=${OPTARG} ;;
        d) CERTIFICATE_AND_CACERT_NAME=${OPTARG} ;;
        r) ROOT_CERT_NAME=${OPTARG} ;;
        o) OPENSSL_CONFIG=${OPTARG} ;;
       \?) echo "Invalid option: -$OPTARG" >&2
           exit 1 ;;
        :)
           echo "Option -$OPTARG requires an argument." >&2
           exit 1 ;;
    esac
done

# Creating a new device certificate using the given Certificate Authority.
openssl genrsa -out $CERTIFICATE_NAME.key 2048
openssl req -config $OPENSSL_CONFIG -new -key $CERTIFICATE_NAME.key -out $CERTIFICATE_NAME.csr
openssl x509 -req -in $CERTIFICATE_NAME.csr -CA $CACERT_NAME.pem -CAkey $CACERT_NAME.key -CAcreateserial -out $CERTIFICATE_NAME.crt -days 365 -sha256
echo "[+] Created a new device certificate ($CERTIFICATE_NAME.key)"

# Creating a file containing the newly created device certificate, along
# with the Certificate Authority.
cat $CERTIFICATE_NAME.crt $CACERT_NAME.pem > $CERTIFICATE_AND_CACERT_NAME
echo "[+] The file containing the new device certificate and the content of the CA is $CERTIFICATE_AND_CACERT_NAME"

# If it doesn't already exist, we download the AWS root certificate required
# to create a connection to AWS IoT, and for the local TLS agent to acknowledge
# that the remote platform is indeed AWS IoT, and not a man in the middle.
if [ ! -f $ROOT_CERT_NAME ]; then
  echo "[+] AWS Root Certificate not detected, downloading it from the Symantec website ..."
  curl $ROOT_CERT_URL | tee $ROOT_CERT_NAME
  echo "[+] The AWS Root certificate has been successfully saved in the local directory ($ROOT_CERT_NAME)"
fi
