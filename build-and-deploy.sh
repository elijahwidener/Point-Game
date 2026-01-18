#!/bin/bash

set -e  # Exit on error

echo "================================"
echo "Point Game - Build & Deploy"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Clean previous build
echo -e "${YELLOW}[1/5] Cleaning previous build...${NC}"
rm -rf dist/
echo -e "${GREEN}✓ Cleaned${NC}"

# Step 2: Build TypeScript
echo -e "${YELLOW}[2/5] Compiling TypeScript...${NC}"
npx tsc
echo -e "${GREEN}✓ TypeScript compiled${NC}"

# Step 3: Install dependencies in dist folder (for Lambda)
echo -e "${YELLOW}[3/5] Installing production dependencies...${NC}"
cd dist
npm init -y
npm install --production @aws-sdk/client-dynamodb @aws-sdk/util-dynamodb @aws-sdk/client-apigatewaymanagementapi
cd ..
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 4: Deploy CDK (if point-game-infra directory exists)
if [ -d "point-game-infra" ]; then
  echo -e "${YELLOW}[4/5] Deploying infrastructure with CDK...${NC}"
  cd point-game-infra
  npm install
  npx cdk deploy --require-approval never
  cd ..
  echo -e "${GREEN}✓ Infrastructure deployed${NC}"
else
  echo -e "${YELLOW}[4/5] Skipping CDK deployment (point-game-infra not found)${NC}"
fi

# Step 5: Summary
echo ""
echo "================================"
echo -e "${GREEN}Build Complete!${NC}"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Update your frontend API_BASE_URL with the REST API endpoint"
echo "2. Add WebSocket endpoint to your frontend config"
echo "3. Test with: npm run test:api (if you have tests)"
echo ""