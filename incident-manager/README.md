# incident-manager

The incident manager is a small Slack app that powers the Airplane incident
response process.

As described in our [accompanying blog post](https://www.airplane.dev/blog),
the code here is intended as a starting point for creating your own incident manager.
You'll probably want to edit the messages and swap dependencies in or out
(e.g., replacing Notion with your organization's document system of choice), among other customizations, before deploying it to production.

## Registering a new Slack app

Before running the incident manager, you need to register it in the Slack developer UI.
Here are the basic steps:

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps), then click
   "Create New App", then "From scratch"
2. Fill out the form then click "Create App"
3. Click "Socket Mode" in the left-hand menu and select "Enable Socket Mode"
4. Select "Slash Commands" in the left-hand menu and create two commands, `/incident`
   and `/resolve-incident`
5. Select "OAuth & Permissions" in the left-hand menu and add the following scopes:
   1. `bookmarks:write`
   2. `channels:manage`
   3. `channels:read`
   4. `chat:write`
   5. `commands`
   6. `users:read`
6. In the same page, select "Install to Workspace"; copy down the "Bot User OAuth Token"
   string that's shown after doing the install
7. Select "Basic Information" from the left-hand menu, then select your token in the
   "App-Level Tokens" section; copy down the value shown

## Running locally

First, configure your environment. At a minimum, you need to set the API token
(from step 6 above) and the app token (from step 7 above):

```
export SLACK_API_TOKEN=...
export SLACK_APP_TOKEN=...
```

Then, run `yarn` followed by `yarn start`.

As described at the top of [`index.js`](/incident-manager/index.js), there are
several other environment variables that can be set to support other features, like
creating PagerDuty incidents and Notion post-mortem docs.

## Deploying

We've provided a `Dockerfile` that can be used to create an image for the
incident manager tool. Once this is built, you can deploy it in your environment
of choice.

The resulting container needs outbound access to the Internet (so it can hit
external HTTPS endpoints), but does not receive any requests from the outside.
