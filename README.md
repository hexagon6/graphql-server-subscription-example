# label-mixer

## Idea:
Add labels to zero-shot classification.
Each label is a lane on a midi-mixer, you can control the threashold like a audio channel.
Run zero-shot classification query after each change and show selected documents dynamically in a vertical scrollable list which updates fast.

## Architecture:
Use HTTP Server Sent Events to notify label-mixer client of new documents and show them directly.

Request Model: Array<Labels> -> Array<DocumentID,Number, Number>

Labels are are strings which are input to the zero-shot model. Each input gets assigned a number between 0 and 1. Depending on how high the number is / high the confidence of a label occurring in the text, we show the result below the mixer, ordered by label.

Using Apollo Graphql [APQ](https://www.apollographql.com/docs/apollo-server/performance/apq/) with HTTP GET SSE Requests so the server can push after finishing each task / document.
