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
 - [Usage](#usage)
 - [See also](#see-also)
 
## Features

 - Package and dependency management for Greengrass applications.
 - Automated deployment of Edge ecosystems on Greengrass Cores.
 - Provisionning of AWS Greengrass on your physical and virtual instances.
 - Introduces [Deployment Templates](https://github.com/HQarroum/green-cli/wiki#deployment-templates) as the Edge Infrastructure as Code language for AWS Greengrass.
 - Live logging of running Lambda functions in the terminal.
 - Remote management of Greegrass fleets.

## Description

The universal [Just In Time Registration (JITR)](https://aws.amazon.com/fr/blogs/iot/just-in-time-registration-of-device-certificates-on-aws-iot/) process made available in this repository is a reference implementation of the JITR for the AWS platform that supports auto-registration of IoT devices connecting themselves directly to the cloud with certficates on AWS IoT and of Greengrass gateways.

The JITR requires usage and registration of a Certificate Authority (CA) maintained by the owner or manufacturer of devices which allows them to issue certificates for devices without involving the AWS IoT service (an example would be mass provisionning of devices within a factory before shipping). The AWS IoT service is then able to invoke a lambda function each time a non-registered certificate associated with the registered CA connects to the AWS IoT platform.

This implementation allows device owners to provision devices by embedding specific attributes in their certificates. Since certificates are signed with the CA, and the CA is registered on AWS IoT, they are considered authentic and non-repudiable.
The universal JITR lambda function does the following when a new device connects to the platform :

 - It validates the certificate fields (see the [Certificate fields] section for more information on required fields. If the fields are incorrect, the registration process is aborted.
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

## Deployment

To deploy this template on your account, simply click on the *Launch Stack* quick-link we provide down below (the template will be deployed in the *us-east-1* region by default, to change this setting, simply change your region in the top-right hand corner of the console after clicking the link).

[![Launch Stack](https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png)](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=aws-iot-just-in-time-registration&templateURL=https://github.com/HQarroum/just-in-time-registration/blob/master/cloudformation/cloudformation.yml)

## Usage

For the sake of genericity, the template provides you with the ability to inject parameters before deploying the stack in the *Parameters* step of the CloudFormation deployment wizard.

The **PolicyName**, **ThingName** and the **ThingTypeName** parameters of the stack can be *parameterized* using variables at run-time dynamically. To insert parameters in the parameter, you must keep the variables between the following enclosure : `<%= my-variable %>`.

As of this version, the only variable accessible through the template is the `certificate` object which has the following schema :

```json
{
  certificate: {
    certificateDescription: {
      certificateId: 'The identifier of the certificate.',
      certificateArn: 'The Arn of the certificate.',
      caCertificateId: 'The certificate ID of the CA certificate used to sign this certificate.',
      status: 'The status of the certificate.',
      certificatePem: 'The certificate data, in PEM format.',
      ownedBy: 'The ID of the AWS account that owns the certificate.',
      previousOwnedBy: 'The ID of the AWS account of the previous owner of the certificate.',
      creationDate: 'The date and time the certificate was created.',
      lastModifiedDate: 'The date and time the certificate was last modified.',
      transferData: 'An associative object holding information relative to transfert data.'
    },
    awsAccountId: 'The ID of the AWS account at the origin of the JITR message.',
    attributes: 'Attributes associated with the certificate's subject field.'
  }
}
```

As such, if the certificate contains the serial number of the device and you want it to be part of its name, you can write the following in the `ThingName` parameter of the template :

```js
thing-<%= certificate.attributes.serialNumber %>
```
