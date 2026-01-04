# Point Game - Complete Deployment Guide

## Prerequisites
- Node.js and npm installed
- AWS CLI configured with credentials
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- Your project files in the correct structure

## Common Issues & Solutions

### Issue: "Cannot find module" errors
**Solution:** run `npx tsc` and that dist/ folder exists with all compiled files.

### Issue: "Access Denied" in Lambda logs
**Solution:** Check that IaC stack grants proper DynamoDB permissions to all Lambda functions.

### Issue: WebSocket connection fails
**Solution:** 
- Verify WEBSOCKET_API_ENDPOINT environment variable is set on Game Lambda
- Check CloudWatch logs for the connect Lambda
- Ensure ConnectionStore table permissions are granted

### Issue: CORS errors from frontend
**Solution:** The IaC already includes CORS configuration. If still occurring, check that your API Gateway has CORS enabled and deployed.

### Issue: State update conflicts
**Solution:** This is expected behavior with concurrent actions. The game uses optimistic locking with gameSeq.

## Monitoring & Debugging

### CloudWatch Logs
Each Lambda function has its own log group:
- `/aws/lambda/AuthLambda`
- `/aws/lambda/TableLambda`
- `/aws/lambda/GameLambda`
- `/aws/lambda/ConnectLambda`
- `/aws/lambda/DisconnectLambda`

### Testing WebSocket Connection
```javascript
const ws = new WebSocket('wss://YOUR-WS-ID.execute-api.us-east-1.amazonaws.com/prod');

ws.onopen = () => {
  console.log('Connected');
  ws.send(JSON.stringify({
    type: 'player_action',
    tableID: 'TABLE-ID',
    userID: 'USER-ID',
    action: 'check',
    payload: {}
  }));
};

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

## Quick Commands Reference

```bash
# Full rebuild and deploy
./build-and-deploy.sh

# Just compile TypeScript
npx tsc

# Just deploy CDK (after build)
cd point-game-infra && npx cdk deploy

# View CDK changes without deploying
cd point-game-infra && npx cdk diff

# Destroy all resources (BE CAREFUL!)
cd point-game-infra && npx cdk destroy

# Watch CloudWatch logs in real-time
aws logs tail /aws/lambda/GameLambda --follow
```

## Notes

- The current implementation uses simple password hashing. For production, integrate AWS Cognito (already in LLD).
- Turn timers are stubbed but not fully implemented yet.
- Hand replayer is Level 3 feature - implement after core gameplay is stable.
- Consider adding rate limiting to prevent abuse.
- Set up CloudWatch alarms for Lambda errors and DynamoDB throttling.