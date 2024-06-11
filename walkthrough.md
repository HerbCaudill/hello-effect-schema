# @effect/schema walkthrough

These are my notes as I work my way through the documentation.

## Creating a schema

This is a schema with two properties: `name` is a string, and `age` is a number that comes in as a string.

```ts
import { Schema as S } from '@effect/schema'

class Person extends S.Class<Person>('Person')({
  name: S.String,
  age: S.NumberFromString,
}) {}
```

`Person` is a JavaScript object (a `class`) that you can pass to other functions:

```ts
const decode = S.decodeSync(Person) // creates a decoder for Person data
```

`Person` is also a TypeScript type:

```ts
const alice: Person = {
  name: 'alice',
  age: 'forty-two',
  //   ~~~~~~~~~~~ Type 'string' is not assignable to 'number'
  foo: 'pizza',
  //   ~~~~~~~ 'foo' does not exist in type 'Person'
}
```

The schema itself doesn't _do_ anything: It's just a definition. It's _data_. But other tools in the
@effect/schema ecosystem can _use_ the schema definition to do things like **validate** and
**transform** data.

## Encoding and decoding data

One of the things we can use a schema for is to convert between some incoming form, to the form we
want to work with.

In this example, we said `age` is a number that "comes in" as a string.

- Maybe it's persisted that way.
- Maybe we get it that way from an HTML input.
- Maybe that's what we get back from an API call.

In this case the _encoded_ form is a string, and the _decoded_ form is a number.

```ts
const decode = S.decodeSync(Person)
const encoded = {
  name: 'Alice',
  age: '25', // <- string
}

const decoded = decode(encoded)
// {
//   name: 'Alice',
//   age: 25 // <- number 👍
// }
```

The `decodeSync` function creates a decoder that expects the encoded type — in this case
`EncodedPerson`.

### Decoding values of unknown type

To make a decoder that can be used to validate something of unknown shape, you can use
`decodeUnknownSync`:

```ts
const decode = S.decodeUnknownSync(Person)
const decoded = decode({ foo: 'bar' }) // ❌ throws
```

You can then catch that error and respond appropriately.

### Excess properties

If the incoming data has any extra properties that aren't in the schema, they're left out of the
result.

```ts
const decoded = encode({
  name: 'Alice',
  age: 42,
  // @ts-expect-error
  foo: 'bar', // <- excess
})
// the `foo` property is omitted from the result
// {
//   name: 'Alice',
//   age: 25
// }
```

## Type-safe error handling

Many functions - parsing or decoding/encoding functions in particular - could either return a
result _or_ throw an error.

The problem with this pattern is that then you have no type information about what errors might be
thrown, what data those errors contain, or how they're structured.

In the functional programming world, it's common to instead _return a value_ that can either contain
the result of successfully running the function _or_ one or more errors.

Effect handles this by returning a "two-sided" `Either` object with _either_ one of two properties:

- `left`, containing one or more errors; OR
- `right`, containing the successful return value.

To go that route we use `S.decodeUnknownEither`:

```ts
const decode = S.decodeUnknownEither(S.DateFromString)
const result = decode(-1234) // type is `Either<Date, ParseResult.ParseError>`

result.right // ❌ does not exist
result.left // type is `ParseResult.ParseError`
// [ParseError: DateFromString
// └─ Encoded side transformation failure
//     └─ Expected a string, actual -1234]
```

## Using a schema to validate data

There are functions to validate data in @effect/schema. These are used to confirm that a given value
is _already_ in the target schema, not that it _can be_ decoded.

```ts
const schema = S.Date
const validate = S.validateSync(schema)

// I use this to confirm that a value is already the target type
const d = new Date('2024-06-11')
expect(validate(d)).toBe(d) // ✅

// If it's not, an error is thrown
expect(() => validate({ 'this is not': 'a date' })).toThrow() // ❌
```

This doesn't work the way I thought, which that you'd use it to tell whether something could be
decoded:

```ts
expect(validate('1970-01-01T00:00:00.000Z')).toEqual(true) // ⛔ not how it works
```

I think the way to actually validate is just to try to decode:

```ts
const decode = S.decodeUnknownSync(schema)
expect(decode('2024-06-11')).toBeInstanceOf(Date) // ✅
expect(() => decode('asdf')).toThrow() // ❌
```

## Setting default values

A schema can define defaults for optional values.

```ts
class Person extends S.Class<Person>('Person')({
  name: S.String,
  age: S.NumberFromString,
  createDate: S.optional(S.DateFromNumber, { default: () => new Date() }),
}) {}
```

When we decode data using this schema, defaults will be filled in for any missing properties:

```ts
const decode = S.decodeUnknownSync(Person)
const alice = decode({ name: 'alice', age: '42' })
// {
//   name: 'alice',
//   age: 42,
//   createDate: [Date]
// }
```

## Branded primitive types

TypeScript types are _structural_ (types are the same if they have the same properties), not
_nominal_ (types are the same if they have the same name). Although we can do this

```ts
type ProductId = string
type CustomerId = string
```

we don't get any type safety that way. TypeScript will let us pass a `ProductId` to a function
that expects a `CustomerId`, and so on.

```ts
const productId: ProductId = `clxalfxhc0000y1rlfyqz1f3m` as ProductId
const customer = getCustomer(productId) // ✅ 👎 wrong, but TypeScript doesn't care
```

To get that type safety we can use the hack of "branding" these different types of string. For example:

```ts
type ProductId = string & { ___ProductId: true }
type CustomerId = string & { ___CustomerId: true }

const productId: ProductId = `clxalfxhc0000y1rlfyqz1f3m` as ProductId
const customer = getCustomer(productId) // ❌ 👍
//                           ~~~~~~~~~ Argument of type 'ProductId' is not assignable
//                                     to parameter of type 'CustomerId`
```

In @effect/schema, we accomplish this using `S.brand`:

```ts
const ProductId = pipe(S.String, S.brand('ProductId'))
```

This `ProductId` is a schema, which is a value. We can get its type from the schema like this:

```ts
type ProductId = typeof ProductId.Type
```

> [!NOTE]
>
> It might seem weird to use the same name for both a value and a type, but it's OK and it's
> idiomatic in Effect.

## Defining custom validation logic

To define custom rules for validating data, we use **filters**.

A filter can consist of an arbitrary function:

```ts
const LongString = pipe(
  S.String,
  S.filter(s => (s.length >= 10 ? undefined : 'a string at least 10 chars long'))
)
```

@effect/schema also includes a ton of built-in filters for strings (`maxLength`, `minLength`,
`length`, `startsWith`, `endsWith`, `includes`, `pattern`, `trimmed`, `lowercased`), numbers
(`greaterThan`, `greaterThanOrEqual`, `positive`, `negative`, `multipleOf`, etc.), BigInts,
BigDecimals, durations, and arrays (`maxItems`, `minItems`, `itemsCount`).

So we could replace the above with this:

```ts
const LongString = pipe(S.String, S.minLength(10))
```

Here's an example of a branded string with a specific format:

```ts
const Cuid = pipe(S.String, S.brand('Cuid'), S.pattern(/^[a-z0-9]{24}$/))
type Cuid = typeof Cuid.Type
```

> [!NOTE]
>
> `pipe` is a utility function provided by Effect; it takes a value followed by an number of
> functions that create a "pipeline". It sends the value through the pipeline, passing the output
> of each function to the next (analogous to the `|` pipe operator in PowerShell or Unix).
>
> ```ts
> import { pipe } from 'effect'
> const length = (s: string): number => s.length
> const double = (n: number): number => n * 2
> const decrement = (n: number): number => n - 1
> pipe('hello', length, double, decrement) // 5 * 2 - 1 = 9
> ```
