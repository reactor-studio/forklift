# Forklift

Forklift is a TypeScript library written to simplify request-response flow in Express.js applications. It is meant to be used as a pre & post core logic middleware. 

![Forklift in action](../assets/forklift-flow.png?raw=true)

## Example usage

First, let's import the `IO` module which is the highlight of this library.  

```javascript
import IO from "@reactor4/forklift";
```

`IO` is a class with both static functions and instance methods which are used in conjuction to ease the process of data validation and manipulation throughout `express.js` request and response flow. 

To be able to validate the data against something, `IO` class needs to be initialized with a JSON Schema. More info about JSON Schema specification can be found [here](https://json-schema.org "JSON Schema specification").

```javascript
const exampleSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Example Schema",
  description: "Schema for creating examples",
  type: "object",
  properties: {
    exampleId: {
      type: "number",
    },
    exampleName: {
      type: "string",
    },
  },
  additionalProperties: false,
  required: ["exampleId", "exampleName"],
};

const exampleIo = new IO(exampleSchema);
```

Now, `ioInstance` can be included as a middleware just like any other.

```javascript
// This is a express.js router

router.post(
  "/example",
  exampleIo.processRequest(),
  // any other business logic, e.g.
  exampleController.post
);
```

Note that `processRequest` method actually returns a function that accepts regular `express.js` middleware arguments (`req`, `res`, `next`). That function executes as a middleware and validates the `req` argument. Validation starts with headers as the **Accept** and **Content-Type** headers are required.

Request is expected to provide the following headers:
```
Accept: application/json
Content-Type: application/json, */*, *
```
Next, the request content is validated (`req.body`) against the provided schema at the `IO` class constructor's first parameter. For example, the `exampleSchema` above expects request's body to provide an object with exactly two properties; **exampleId** and **exampleName**, of types `number` and `string`, respectively.

If the headers or body do not comply with the specification, an error is thrown inside the module which is expected to be handled explicitly. 

Nevertheless, if the request passes the validation, the request's body is stored under *locals.io.data* namespace inside the `req` middleware object. Forklift actually provides additional static functions that make the *locals* namespace easy to manipulate with.

For example,
```javascript
static set(target: object, data: any, status: Status = Status.OK, path: string = null)
```
is the most general one which sets the object at *locals.io.data.${path}* to the provided `data` argument, as well as setting *locals.io.status* to the `status` value (enum which can be imported from Forklift).

Such approach is expected when setting the response data so Forklift can know what data to validate and serialize. 

```javascript
// exampleController

post(req, res, next) {
  ...
  // business logic
  ...
  // e.g. setCreated sets response status to 201
  IO.setCreated(res, { status: "Success" });
}
```

To conclude the pipeline and send the response another middleware method is required.

```javascript
router.post(
  "/example",
  exampleIo.processRequest(),
  // any other business logic, e.g.
  exampleController.post,
  exampleIo.sendResponse()
);
```

This will validate the response data (located at `res` object's *locals.io.data* namespace) if response JSON schema was provided as third parameter in `IO` class constructor. The second parameter is specified as `options` object which for now includes possibility to include other valid **Content-Type** headers.

```javascript
const exampleIo = new IO(
  reqSchema, 
  { contentTypes: ["text/html"] }, 
  resSchema 
);
```
