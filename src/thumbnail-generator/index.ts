import {
    APIGatewayProxyEvent
} from "aws-lambda";

async function main(event: APIGatewayProxyEvent) {
    console.log("event is", JSON.stringify(event, null, 4));
    return {
        body: JSON.stringify({message: 'Success'}),
        statusCode: 200,
    };
}

module.exports = {main};
