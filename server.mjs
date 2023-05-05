import { readFileSync } from 'node:fs'
import { createServer } from 'http'
import cors from 'cors'
import bodyParser from 'body-parser'
import express from 'express'
import { PubSub } from 'graphql-subscriptions'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { expressMiddleware } from '@apollo/server/express4'

const typeDefs = readFileSync('./schema.graphql', 'utf8')

const pubsub = new PubSub()
const resolvers = {
  Query: {
    // typed resolvers!
  },
  Subscription: {
    hello: {
      // Example using an async generator
      subscribe: async function* () {
        for await (const word of ['Hello', 'Bonjour', 'Ciao']) {
          yield { hello: word }
        }
      },
    },
    postCreated: {
      subscribe: () => pubsub.asyncIterator(['POST_CREATED']),
    },
  },
}

const schema = makeExecutableSchema({ typeDefs, resolvers })

const path = '/graphql'

// Required logic for integrating with Express
const app = express()
// Our httpServer handles incoming requests to our Express app.
// Below, we tell Apollo Server to "drain" this httpServer,
// enabling our servers to shut down gracefully.
const httpServer = createServer(app)

// Creating the WebSocket server
const wsServer = new WebSocketServer({
  // This is the `httpServer` we created in a previous step.
  server: httpServer,
  // Pass a different path here if app.use
  // serves expressMiddleware at a different path
  path,
})

// Hand in the schema we just created and have the
// WebSocketServer start listening.
const serverCleanup = useServer({ schema }, wsServer)

const server = new ApolloServer({
  schema,
  plugins: [
    // Proper shutdown for the HTTP server.
    ApolloServerPluginDrainHttpServer({ httpServer }),
    // Proper shutdown for the WebSocket server.
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose()
          },
        }
      },
    },
  ],
})

// Ensure we wait for our server to start
await server.start()
// Set up our Express middleware to handle CORS, body parsing,
// and our expressMiddleware function.
app.use(
  path,
  cors(),
  bodyParser.json(),
  // expressMiddleware accepts the same arguments:
  // an Apollo Server instance and optional configuration options
  expressMiddleware(server, {
    context: async ({ req }) => ({ token: req.headers.token }),
  })
)

const hostname = 'localhost'
const port = 4000
// Modified server startup
await new Promise((resolve) => httpServer.listen(port, hostname, resolve))

console.log(`🚀 Server ready at http://${hostname}:${port}${path}`)

// pubsub client
// FIXME: replace with production PubSub libraries https://www.apollographql.com/docs/apollo-server/data/subscriptions/#production-pubsub-libraries
let id = 0
setInterval(
  () =>
    // https://www.apollographql.com/docs/apollo-server/data/subscriptions/#publishing-an-event
    pubsub.publish('POST_CREATED', {
      postCreated: {
        id: id++,
        author: { firstName: 'Ali', lastName: 'Baba' },
        title: 'Open sesame',
      },
    }),
  10000
)
