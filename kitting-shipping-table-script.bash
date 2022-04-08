### table provisioning script

#!/bin/bash

set -x

while getopts e:R:r: flag
do
    case "${flag}" in
        e) env=${OPTARG};;
		R) Region1=${OPTARG};;
		r) Region2=${OPTARG};;
    esac
done
echo "environment: ${env}";
echo "Region1: ${Region1}";
echo "Region2: ${Region2}";

if [ "$env" = "dev" -o "$env" = "qa" -o "$env" = "beta"  ] #on-demand capacity
then

## Table 1

aws dynamodb create-table --table-name ${env}_global_rpm_app_common_data --attribute-definitions AttributeName=ptype#id,AttributeType=S AttributeName=stype#sk,AttributeType=S AttributeName=ltype#lsik,AttributeType=S --key-schema AttributeName=ptype#id,KeyType=HASH AttributeName=stype#sk,KeyType=RANGE --billing-mode PAY_PER_REQUEST --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES --local-secondary-indexes IndexName=lsik-index,KeySchema=["{AttributeName=ptype#id,KeyType=HASH}","{AttributeName=ltype#lsik,KeyType=RANGE}"],Projection="{ProjectionType=ALL}" --tags Key=env,Value=${env}-foresight --region ${Region1}

fi

if [ "$env" = "stg" -o "$env" = "prd" ] #auto-scaling enabled
then

## Table 1

aws dynamodb create-table --table-name ${env}_global_rpm_app_common_data --attribute-definitions AttributeName=ptype#id,AttributeType=S AttributeName=stype#sk,AttributeType=S AttributeName=ltype#lsik,AttributeType=S --key-schema AttributeName=ptype#id,KeyType=HASH AttributeName=stype#sk,KeyType=RANGE --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES --local-secondary-indexes IndexName=lsik-index,KeySchema=["{AttributeName=ptype#id,KeyType=HASH}","{AttributeName=ltype#lsik,KeyType=RANGE}"],Projection="{ProjectionType=ALL}" --tags Key=env,Value=${env}-foresight --region ${Region1}

aws application-autoscaling register-scalable-target --service-namespace dynamodb --resource-id "table/${env}_global_rpm_app_common_data" --scalable-dimension "dynamodb:table:WriteCapacityUnits" --min-capacity 5 --max-capacity 40000 --region ${Region1}

aws application-autoscaling register-scalable-target --service-namespace dynamodb --resource-id "table/${env}_global_rpm_app_common_data" --scalable-dimension "dynamodb:table:ReadCapacityUnits" --min-capacity 5 --max-capacity 40000 --region ${Region1}

aws application-autoscaling put-scaling-policy --service-namespace dynamodb --resource-id "table/${env}_global_rpm_app_common_data" --scalable-dimension "dynamodb:table:WriteCapacityUnits" --policy-name "DynamoDBWriteCapacityUtilization" --policy-type "TargetTrackingScaling" --target-tracking-scaling-policy-configuration file://scaling-policywrite.json --region ${Region1}

aws application-autoscaling put-scaling-policy --service-namespace dynamodb --resource-id "table/${env}_global_rpm_app_common_data" --scalable-dimension "dynamodb:table:ReadCapacityUnits" --policy-name "DynamoDBReadCapacityUtilization" --policy-type "TargetTrackingScaling" --target-tracking-scaling-policy-configuration file://scaling-policyread.json --region ${Region1}

fi

if [ "${Region2}" = "us-east-1" -a "$env" = "stg" -o "$env" = "prd" ] #global-table
then

## Global Table 1

aws dynamodb create-table --table-name ${env}_global_rpm_app_common_data --attribute-definitions AttributeName=ptype#id,AttributeType=S AttributeName=stype#sk,AttributeType=S AttributeName=ltype#lsik,AttributeType=S --key-schema AttributeName=ptype#id,KeyType=HASH AttributeName=stype#sk,KeyType=RANGE --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=5 --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES --local-secondary-indexes IndexName=lsik-index,KeySchema=["{AttributeName=ptype#id,KeyType=HASH}","{AttributeName=ltype#lsik,KeyType=RANGE}"],Projection="{ProjectionType=ALL}" --tags Key=env,Value=${env}-foresight --region ${Region2}

aws application-autoscaling register-scalable-target --service-namespace dynamodb --resource-id "table/${env}_global_rpm_app_common_data" --scalable-dimension "dynamodb:table:WriteCapacityUnits" --min-capacity 1 --max-capacity 40000 --region ${Region2}

aws application-autoscaling register-scalable-target --service-namespace dynamodb --resource-id "table/${env}_global_rpm_app_common_data" --scalable-dimension "dynamodb:table:ReadCapacityUnits" --min-capacity 1 --max-capacity 40000 --region ${Region2}

aws application-autoscaling put-scaling-policy --service-namespace dynamodb --resource-id "table/${env}_global_rpm_app_common_data" --scalable-dimension "dynamodb:table:WriteCapacityUnits" --policy-name "DynamoDBWriteCapacityUtilization" --policy-type "TargetTrackingScaling" --target-tracking-scaling-policy-configuration file://scaling-policywrite.json --region ${Region2}

aws application-autoscaling put-scaling-policy --service-namespace dynamodb --resource-id "table/${env}_global_rpm_app_common_data" --scalable-dimension "dynamodb:table:ReadCapacityUnits" --policy-name "DynamoDBReadCapacityUtilization" --policy-type "TargetTrackingScaling" --target-tracking-scaling-policy-configuration file://scaling-policyread.json --region ${Region2}

aws dynamodb create-global-table --global-table-name ${env}_global_rpm_app_common_data --replication-group RegionName=${Region1} RegionName=${Region2} --region ${Region1}

fi


sleep 100s

## Enable PITR

if [ "${env}" = "prd" ]
then

aws dynamodb update-continuous-backups --table-name ${env}_global_rpm_app_common_data --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true --region ${Region1}

aws dynamodb update-continuous-backups --table-name ${env}_global_ofc_transaction --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true --region ${Region1}

aws dynamodb update-continuous-backups --table-name ${env}_global_ofc_master --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true --region ${Region1}

aws dynamodb update-continuous-backups --table-name ${env}_global_ofc_rewards --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true --region ${Region1}

fi


