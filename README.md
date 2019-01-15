<br />
<p align="center">
  <img width="220" src="assets/icon.png" />
</p>
<br />

# just-in-time-registration
> A universal implementation of the AWS JITR for IoT devices and AWS Greengrass.

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](contributing.md)
[![CodeFactor](https://www.codefactor.io/repository/github/hqarroum/just-in-time-registration/badge)](https://www.codefactor.io/repository/github/hqarroum/just-in-time-registration)

Current version: **1.0.0**

Lead Maintainer: [Halim Qarroum](mailto:hqm.post@gmail.com)

## Table of content

 - [Features](#features)
 - [Description](#description)
 - [Certificate fields](#certificate-fields)
 - [Pre-requisites](#pre-requisites)
 - [Deployment](#deployment)
 - [Template parameters](#template-parameters)
 - [Command-line tools](#command-line-tools)
 - [See also](#see-also)
 
## Features

 - Universal Just-in-Time Registration implementation for Greengrass devices and IoT devices.
 - Allows synamic parameterization of your thing attributes given certificate fields.
 - Provides the tooling to create your custom Root CA and device certificates in an automated fashion.
 - Allows injection of implementer-provided Lambda function to validate the registration.

## Description

The universal [Just In Time Registration (JITR)](https://aws.amazon.com/fr/blogs/iot/just-in-time-registration-of-device-certificates-on-aws-iot/) process made available in this repository is a reference implementation of the JITR for the AWS platform that supports auto-registration of IoT devices connecting themselves directly to the cloud with certficates on AWS IoT and of Greengrass gateways.

The JITR process requires usage and registration of a [Root Certificate of Authority (Root CA)](https://en.wikipedia.org/wiki/Root_certificate) maintained by the owner or manufacturer of devices which allows them to issue certificates for devices without involving the AWS IoT service (an example would be mass provisionning of devices within a factory before shipping). The AWS IoT service is then able to invoke a lambda function each time a non-registered certificate associated with the registered CA connects to the AWS IoT platform.

This implementation allows device owners to provision devices by embedding specific attributes in their certificates. Since certificates are signed with your Root CA, and it is registered on AWS IoT, embedded fields are considered authentic and non-repudiable.
The universal JITR lambda function takes the following actions when a new device connects to the platform :

 - It validates the certificate fields (see the [Certificate fields](#certificate-fields) section for more information on required fields. If the fields are incorrect, the registration process is aborted.
 - It optionally asynchronoysly calls an external implementer-provided Lambda function which can be served as a callback to define whether to continue the registration process or not. This can come in handy when implementers maintain a Certificate Revocation List (CRL) for instance, but can be used for any purpose really.
 - It creates a thing associated with the new device which will be provisioned with its certificates attributes.
 - It associates your thing to a thing type.
 - It creates a policy associated with your things.
 - It associates the created policy with the new thing.
 - It creates the certificate in the AWS IoT certificate registry and activates it.
 
 > Note that the activation of the certificate is the latest step to be executed in order to guarantee that when a device suceeds to connect, every resources is already available on the account.

 ## Certificate fields
 
 You can embed any standard field into your X.509 certificates, but to enforce consistency across a fleet, this implementation requires you to provide the following three fields in the device certificate :
 
  - **commonName** - Identifies the device common name on the platform.
  - **serialNumber** - Allows to uniquely address your device on the platform (used in our AWS IoT policy to enforce the device permissions on the platform.
  - **subjectAltName** - Identifies the type of the device, supported values are `greengrass` or `iot` to identify a non-Greengrass device. This field will be used to determine whether the invoked Lambda function should create a Greengrass Core in addition to the thing 
 
> These three required attributes will be associated to the created `Thing` in the AWS IoT device registry as searchable attributes. This will allow you to easily query the registry for these attributes across your entire fleet.

All the other certificate attributes contained in the certificate are associated with non-searchable attributes on the created `Thing` object.

 ## Pre-requisites

A few components are required as dependencies to this project before using the scripts it contains :

  - The [openssl](https://wiki.openssl.org/index.php/Command_Line_Utilities) command-line tools should be installed on your operating system. These tools usually are already pre-installed on most Linux distributions, and on MacOS.
  - The [jq](https://stedolan.github.io/jq/) command-line tool enables the script to parse JSON documents and consume its content. This tool is available on every major operating system.
  - The [AWS CLI](https://aws.amazon.com/fr/cli/) must be installed and configured with at least one account.
  - The [mosquitto_pub](https://mosquitto.org/man/mosquitto_pub-1.html) command-line tools to test your generated certificates.

## Deployment

To deploy this template on your account, simply click on the *Launch Stack* quick-link we provide down below (the template will be deployed in the *us-east-1* region by default, to change this setting, simply change your region in the top-right hand corner of the console after clicking the link).

[![Launch Stack](https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png)](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=aws-iot-just-in-time-registration&templateURL=https://github.com/HQarroum/just-in-time-registration/blob/master/cloudformation/cloudformation.yml)

## Template parameters

For the sake of genericity, the template provides you with the ability to inject parameters before deploying the stack in the *Parameters* step of the CloudFormation deployment wizard.

The **PolicyName**, **ThingName** and the **ThingTypeName** parameters of the stack can be *parameterized* using variables at run-time dynamically. To insert parameters in the parameter, you must keep the variables between the following enclosure : `<%= my-variable %>`.

As of this version, the only variable accessible through the template is the `certificate` object which has the following schema :

```json
{
  "certificate": {
    "certificateDescription": {
      "certificateId": "The identifier of the certificate.",
      "certificateArn": "The Arn of the certificate.",
      "caCertificateId": "The certificate ID of the CA certificate used to sign this certificate.",
      "status": "The status of the certificate.",
      "certificatePem": "The certificate data, in PEM format.",
      "ownedBy": "The ID of the AWS account that owns the certificate.",
      "previousOwnedBy": "The ID of the AWS account of the previous owner of the certificate.",
      "creationDate": "The date and time the certificate was created.",
      "lastModifiedDate": "The date and time the certificate was last modified.",
      "transferData": "An associative object holding information relative to transfert data."
    },
    "awsAccountId": "The ID of the AWS account at the origin of the JITR message.",
    "attributes": "Attributes associated with the certificate's subject field."
  }
}
```

As such, if the certificate contains the serial number of the device and you want it to be part of its name, you can write the following in the `ThingName` parameter of the template :

```js
thing-<%= certificate.attributes.serialNumber %>
```

## Command-line tools

This project features two scripts in the `bin` directory :

  - `create-and-register-ca.sh` starts the process of creating a Certificate Authority and will, if you accept it, register the newly created certificate on AWS IoT, activate it, and enable its auto registration status.
  - `create-device-certificate.sh` uses a previously created Certificate Authority to sign a new device certificate which is ready to be provisionned on a device.

In order to be able to execute the above scripts, make sure that they are executable. On a Unix system, you can run `chmod +x <your_script>` in order to do so.

### Create and register a CA

The `create-and-register-ca.sh` script does not take mandatory arguments, but you can specify optional one:

  - `-c` takes as an option the name of the resulting CA file. For example, `-c foo` will produce the `foo.key`, the `foo.pem` and the `foo.srl` files. Its default value is `my-ca-certificate`.
  - `-p` takes as an option the name of the private key created as a result of the CSR associated with the registration code. Its default value is `private-key-registration`.
  - `-c` takes as an option the path to the OpenSSL configuration file to use for the Certificate Authority. The default path is `./config/openssl-ca.conf`.

Once you run the script, it will generate all the keys required to produce and register the new CA. The script will prompt you whether you want to register the CA right away on AWS IoT after its creation.

The configuration file associated with the creation of the CA is located by default at `./config/openssl-ca.conf`. In this file you can customize OpenSSL properties, and update the informations registered in the certificate (OrganizationName, Country, CommonName, etc.).

### Create a device certificate

The `create-device-certificate.sh` script does not take mandatory arguments, but you can specify optional one:

  - `-c` takes as an option the name of the Certificate Authority used to sign the device certificate. Its default value is `my-ca-certificate`.
  - `-n` takes as an option the name of the resulting device certificate. Its default value is `my-device-cerificate`.
  - `-r` takes as an option the path of the reulting AWS Root certificate that will automatically be downloaded. Its default value is `aws-root-cert.pem`.
  - `-c` takes as an option the path to the OpenSSL configuration file to use for the device certificate. The default path is `./config/openssl-device.conf`.

The script when run will create a new set of device certificates that will be ready to use to connect to AWS IoT. The script will automatically download the AWS Root certificate to allow you to test the connection right away.

> Take a look at the default configuration file to customize informations associated with the certificate before you generate one.

### Testing the certificates

Once you CA has been registered and your device certificate has been generated, you can test the connection using the `mosquitto_pub` command-line tool :

```bash
mosquitto_pub --cafile aws-root-cert.pem --cert device-and-ca-certificate.crt --key my-device-cerificate.key -h <prefix>.iot.<region>.amazonaws.com -p 8883 -q 1 -t foo/bar -i  anyclientID --tls-version tlsv1.2 -m "Hello" -d
```

Note that if you did not register the device certificate with AWS IoT manually, and you are using JITR, the TLS connection will fail, but a message will be published on `$aws/events/certificates/registered/+`.

### Working with multiple accounts

If you have registered multiple account credentilas into your AWS CLI's configuration, you can select on which account you'd want to deploy the CA by specifying an inline environment value :

```bash
AWS_PROFILE=my-profile ./create-and-register-ca.sh
```
