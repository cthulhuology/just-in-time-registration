#!/bin/bash

# Stopping the script when a command's exit code signals a failure.
set -e 
set -o pipefail

# Variables.
CACERT_NAME='my-ca-certificate'
PRIVATE_KEY_NAME='private-key-registration'
OPENSSL_CONFIG='./config/openssl-ca.conf'

# Retrieving arguments from the command-line.
while getopts ":c:p:o:" o; do
    case "${o}" in
        c) CACERT_NAME=${OPTARG} ;;
        p) PRIVATE_KEY_NAME=${OPTARG} ;;
        o) OPENSSL_CONFIG=${OPTARG} ;;
       \?) echo "Invalid option: -$OPTARG" >&2
           exit 1 ;;
        :)
           echo "Option -$OPTARG requires an argument." >&2
           exit 1 ;;
    esac
done

# Creates a new X.509 CA certificate.
openssl genrsa -out $CACERT_NAME.key 2048
openssl req -config $OPENSSL_CONFIG -x509 -new -nodes -key $CACERT_NAME.key -sha256 -days 365 -out $CACERT_NAME.pem
echo "[+] Created new X.509 CA certificate ($CACERT_NAME.pem)"

# Retrieves an AWS IoT registration code using the CLI.
REGISTRATION_CODE="$(aws iot get-registration-code | jq '.registrationCode' --raw-output)"
echo "[+] Got registration code from AWS IoT - $REGISTRATION_CODE"

# Creating a CSR using the registration code.
openssl genrsa -out $PRIVATE_KEY_NAME.key 2048
openssl req -new -key $PRIVATE_KEY_NAME.key -subj "/CN=$REGISTRATION_CODE" -out $PRIVATE_KEY_NAME.csr
echo "[+] Created a CSR using the registration code ($PRIVATE_KEY_NAME.csr)"

# Creating a new X.509 certificate using the CSR and the CA certificate.
openssl x509 -req -in $PRIVATE_KEY_NAME.csr -CA $CACERT_NAME.pem -CAkey $CACERT_NAME.key -CAcreateserial -out $PRIVATE_KEY_NAME.crt -days 365 -sha256
echo "[+] Created a new X.509 certificate using the CSR and the CA certificate ($PRIVATE_KEY_NAME.crt)"

# Certificate Authority registration in AWS IoT.
# We prompt the user to accept the registration.
read -p "We are going to register your CA in AWS IoT, would you like to continue (y/n)? "
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "[!] Aborting the operation"
  exit
fi
echo "[+] Registering the CA certificate on AWS IoT ..."
CERTIFICATE_ID="$(aws iot register-ca-certificate --ca-certificate file://$CACERT_NAME.pem --verification-certificate file://$PRIVATE_KEY_NAME.crt | jq '.certificateId' --raw-output)"
echo "[+] Successfully registered the CA certificate, retrieving information about the certificate registration ..."
aws iot describe-ca-certificate --certificate-id $CERTIFICATE_ID

# Activating the Certificate Authority on AWS IoT.
echo "[+] Activating the Certificate Authority on AWS IoT ..."
aws iot update-ca-certificate --certificate-id $CERTIFICATE_ID --new-status ACTIVE
echo "[+] Successfully activate the Certificate Authority"

# Enabling the auto-registration-status of the CA on AWS IoT.
echo "[+] Enabling the auto-registration-status of the CA on AWS IoT ..."
aws iot update-ca-certificate --certificate-id $CERTIFICATE_ID --new-auto-registration-status ENABLE
echo "[+] Successfully enabled the auto-registration-status of the Certificate Authority"
echo "[+] You can see your newly registered CA in your console at: https://console.aws.amazon.com/iotv2/home#/cacertificatehub"




