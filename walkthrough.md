```ts
import { Schema as S } from '@effect/schema'
```

## Creating a `Struct` schema

This is a schema with two properties: `name` is a string, and `age` is a number that comes in as a string.

```ts
const Person = S.Struct({
  name: S.String,
  age: S.NumberFromString,
})
```

Note that `Person` kind of _looks_ like a TypeScript type, but it's not - it's a JavaScript object. We can obtain the corresponding type though:

```ts
type Person = typeof Person.Type

const p1: Person = {
  name: 'Alice',
  age: 42, // ok
}

const p2: Person = {
  name: 'Bob',
  age: '35',
  //❌ ~~~ Type 'string' is not assignable to 'number'
}
```

> [!NOTE]  
> It might seem strange to give the type the same name as the schema object, but it's OK — and it's idiomatic in Effect.

Similarly, we can obtain the type of the _encoded_ form:

```ts
type PersonEncoded = typeof Person.Encoded

const p3: PersonEncoded = {
  name: 'Alice',
  age: '42', // ok
}ñ

const p4: PersonEncoded = {
  name: 'Bob',
  age: 35,
  //❌~~~ Type 'number' is not assignable to 'string'
}
```

## Creating a `Class` schema

Alternatively, we can avoid the weirdness of having to define `Person` as both the `Struct` and its corresponding type, by using a `Schema.Class` instead:

```ts
class Person extends S.Class<Person>('Person')({
  name: S.String,
  age: S.NumberFromString,
}) {}
```

## Using a schema to encode and decode data

The schema itself doesn't _do_ anything: It's just a definition — just data. But other tools provided by @effect/schema can _use_ the schema definition to do things like **validate** and **transform** data.

One of the things we can use a schema for is to convert between some incoming form, to the form we want to work with.

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

The `decodeSync` function creates a decoder that expects the encoded type — in this case `EncodedPerson`.

To make a decoder that can be used to validate something of unknown shape, you can use `decodeUnknownSync`:

```ts
const decode = S.decodeUnknownSync(Person)
const decoded = decode({ foo: 'bar' }) // ❌ throws
```

You can then catch that error and respond appropriately.

If the incoming data has **excess properties**, they're left out of the result.

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

## Using a schema to validate data

There are functions to validate in @effect/schema. These are used to confirm that a given value is _already_ in the target schema,
not that it can be decoded.

```ts
const schema = S.Date
const validate = S.validateSync(schema)

// I use this to confirm that a value is already the target type
const d = new Date('2024-06-11')
expect(validate(d)).toBe(d)

// If it's not, an error is thrown
expect(() => validate({ 'this is not': 'a date' })).toThrow()
```

This doesn't work the way I thought, which that you'd use it to tell whether something could be decoded:

```ts
expect(validate('1970-01-01T00:00:00.000Z')).toEqual(true)
```

I think the way to actually validate is just to try to decode:

```ts
const decode = S.decodeUnknownSync(schema)
expect(decode('2024-06-11')).toBeInstanceOf(Date)
expect(() => decode('asdf')).toThrow()
```

## Default values

A schema can define defaults for optional values.

```ts
class Person extends S.Class<Person>('Person')({
  name: S.String,
  age: S.NumberFromString,
  createDate: S.optional(S.DateFromNumber),
}) {}

const decode = S.decodeUnknownSync(Person)
const alice = decode({ name: 'alice', age: '42' })
// {
//   name: 'alice',
//   age: 42,
//   createDate: [Date]
// }
```

## Using a schema to
