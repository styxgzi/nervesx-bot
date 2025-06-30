#!/bin/bash

# Set variables
REGISTRY="registry.digitalocean.com/nervesx"
IMAGE_NAME="nervesx-bot" # Specific image name within the registry
TAG="latest"
DOCKERFILE_PATH="." # Assuming your Dockerfile is in the current directory
CHART_PATH="./helm" # Path to your Helm chart
RELEASE_NAME="nervesx-bot" # Helm release name for your application
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"
TARGET_PLATFORM="linux/amd64" # Target platform for the build
NAMESPACE="nervesx-bot"
# Build the Docker image for the specified target platform
echo "Building Docker image for ${TARGET_PLATFORM}..."
docker build --platform ${TARGET_PLATFORM} -t ${FULL_IMAGE_NAME} ${DOCKERFILE_PATH}

# Check if the build was successful
if [ $? -eq 0 ]; then
    echo "Docker image built successfully for ${TARGET_PLATFORM}."
else
    echo "Docker build failed. Exiting..."
    exit 1
fi

# Push the Docker image to DigitalOcean Container Registry
echo "Pushing Docker image to DigitalOcean Container Registry..."
docker push ${FULL_IMAGE_NAME}

# Check if the push was successful
if [ $? -eq 0 ]; then
    echo "Docker image pushed successfully."
else
    echo "Docker push failed. Exiting..."
    exit 1
fi

# Update the Helm chart values with the new image
echo "Updating Helm chart with the new image..."
helm upgrade --install ${RELEASE_NAME} ${CHART_PATH} \
    --set image.repository=${REGISTRY}/${IMAGE_NAME} \
    --set image.tag=${TAG} \
    --namespace ${NAMESPACE}


# Check if Helm deployment was successful
if [ $? -eq 0 ]; then
    echo "Application deployed successfully via Helm."
else
    echo "Helm deployment failed. Exiting..."
    exit 1
fi
