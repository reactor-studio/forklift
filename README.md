# Forklift 
[![Build Status](https://travis-ci.org/reactor-studio/forklift.svg?branch=master)](https://travis-ci.org/reactor-studio/forklift)

Forklift is a TypeScript library written to simplify request-response flow in Express.js applications. It is meant to be used as a pre & post core logic middleware. 

![Forklift's IO in action](../assets/forklift-flow.png?raw=true)

## Example usage

### IO

First, let's import the `IO` module.  

```javascript
import { IO } from "@reactor4/forklift";
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
import { IO, Status } from "@reactor4/forklift";

post(req, res, next) {
  ...
  // business logic
  ...

  IO.set(response, data, Status.CREATED);
  // or simply
  IO.setCreated(response, data);
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

The final middleware function `sendResponse` will validate the response data (located at `res` object's *locals.io.data* namespace) if response JSON schema was provided as third parameter in `IO` class constructor. The second parameter is specified as `options` object which for now includes possibility to include other valid **Content-Type** headers.

```javascript
const exampleIo = new IO(
  reqSchema, 
  { contentTypes: ["text/html"] }, 
  resSchema 
);
```

### Middleware & Errors

Two basic middleware functions that come with Forklift provide out of the box pipeline error handling with clean code base in mind.  

```javascript
import { errorMiddleware } from "@reactor4/forklift";
```

Let's start with the more straight forward one, `errorMiddleware`. This is simply a Forklift implementation of an error handler that is expected to be included at the end of the Express.js pipeline. 

```javascript
// e.g.
app.use(someRouter);
app.use(someOtherRouter);
app.use(errorMiddleware());
```

Expected behavior of this middleware is to handle special type of errors which extend `ForkliftError` class. It is designed to provide a possibilty to add custom errors without much hassle. Every error that is a subclass of `ForkliftError` has `toJson` method available which will provide a pretty formatted object of error details.

```javascript
import ForkliftError from '@reactor4/forklift';

class ForbiddenError extends ForkliftError {
  constructor(message: string) {
    // ForkliftError's constructor expects message, status of the response to be written, and an error name
    super(message, 403, 'Forbidden');
  }
}
```

In the example above, Forklift's implementation of `ForbiddenError` can be seen. Same pattern can be reused for any other custom error type. Forklift comes with some common HTTP error types ready. 

```javascript
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError } from "@reactor4/forklift";
```

To be able to use *async/await* promise syntax and still use an error handler like described Forklift's middleware, **without** wrapping each of your *await*'s inside a *try/catch* block Forklift provides a higher order function which can be used to wrap pipeline handlers. 

```javascript
import { asyncMiddleware, BadRequestError, ForbiddenError } from "@reactor4/forklift";

  getItems() {
    return asyncMiddleware(async (req: Request, res: Response) => {
      if (!req.params.size) {
        throw new BadRequestError(`"Size" query parameter not provided!`);
      }

      const isAuthorized = await checkUser(req.headers);

      if (!isAuthorized) {
        throw new ForbiddenError("User is unauthorized for this action.");
      }

      const items = await getXAmountOfItems(req.params.size);

      IO.set(res, items);
    });
  }
```

`asyncMiddleware` basically wraps the function argument inside a *try/catch* block and calls the next function after it's completed. 