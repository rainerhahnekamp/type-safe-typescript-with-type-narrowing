# Type-Safe TypeScript with Type Narrowing

The original article is available on: https://www.rainerhahnekamp.com/en/type-safe-typescript-with-type-narrowing/

- [Type-Safe TypeScript with Type Narrowing](#type-safe-typescript-with-type-narrowing)
  - [1. Introduction](#1-introduction)
  - [2. Equality Narrowing](#2-equality-narrowing)
  - [3. `typeof`](#3-typeof)
  - [4. Truthiness Narrowing](#4-truthiness-narrowing)
  - [5. `instanceof`](#5-instanceof)
  - [6. Discriminated Union](#6-discriminated-union)
  - [7. `in` Type Guard](#7-in-type-guard)
  - [8. Type Predicate](#8-type-predicate)
  - [9. Type Narrowing against `unknown`](#9-type-narrowing-against-unknown)
    - [9.1. Manual Validation](#91-manual-validation)
    - [9.2. Automatic Validation: zod](#92-automatic-validation-zod)
  - [10. Assertion Functions](#10-assertion-functions)
  - [11. Summary](#11-summary)

This article shows common patterns to maximize TypeScript's potential for type-safe code. These techniques are all part of the same group, which we call type narrowing.

A video version of this article is available on:

<a href="https://youtu.be/MUJBT3Pb_Eg"><img src="./video.jpg"></a>

## 1. Introduction

Whenever we deal with a variable that can be of multiple types, like an `unknown` or a union type, we can apply type narrowing, to "narrow" it down to one specific type. We work together with the TypeScript compiler because it understands the context of our code and guarantees that this narrowing happens in a fully type-safe way.

Let's say we have a function with a parameter of type `Date | undefined`. Every time the function executes, the variable's type can either be `Date` or `undefined`, but not both types at the same time.

```typescript
function print(value: Date | undefined): void {}
```

If we apply an `if` condition, checking if that variable is not `undefined`, TypeScript understands its meaning and treats the value inside the condition only as a `string`. This is type narrowing.

```typescript
function print(input: Date | undefined): void {
  if (input !== undefined) {
    input.getTime(); // 👍 value is only Date
  }

  input.getTime(); // 💣 fails because value can be Date or undefined
}
```

There is also a very similar technique which is called type assertion. It looks like the easier option at first sight. In terms of type-safety though, it is not. We manually set the type and therefore overwrite the compiler.

If the compiler could speak to us, it would say something like: "OK, you know what you are doing there, but don't blame me if something goes wrong."

Therefore we should avoid type assertion and always favour type narrowing. (And in general: trying to be smarter than the compiler is never a good idea.)

```typescript
function print(input: Date | undefined): void {
  (input as Date).getTime(); // type assertion - don't!
}
```

After this short introduction, let's come up with an example where we see the major type narrowing techniques in action.

This will be our "workbench":

```typescript
declare function diffInYears(input: Date): number;
declare function parse(input: string): Date;

function calcAge(input: Date | null | undefined): number {
  return diffInYears(input); // will not work
}
```

`calcAge`, should return - as the name says - the age.

Additionally, we use the two utility functions `diffInYears` and `parse`. For simplicity, the snippet doesn't show their implementation.

The type of `input` in `calcAge` can be of three different types. The return statement will therefore fail to compile.

## 2. Equality Narrowing

An obvious start would be to check if `input` doesn't have the value `null` and `undefined`. If that's the case, then it can only be a `Date`.

If we add this condition, TypeScript understands it and treats `input` inside the `if`-block as `Date` and we can safely call `diffInYears`.

This "implicit understanding" of TypeScript is already our first type guard and it is called "Equality Narrowing".

```typescript
function calcAge(input: Date | null | undefined): number {
  if (input !== null && input !== undefined) {
    return diffInYears(input);
  }
}
```

Please be aware, that the `if` condition is not a direct check for the type `undefined` or `null`. It runs against the value. In the same way, we would not be able to write a type check against a `Date`: `value === Date`. `Date` is the type of `input` and not its value.

So why can we use `undefined` and `null` then? The answer is quite obvious. The type `undefined` has just one value, which is 'undefined'. And the same is true for `null`. The type `null` can only have one value, and that is 'null'.

So what our condition really does, is that it is excluding all possible values that can come for `undefined` or `null`. For obvious reasons, we don't want want to exclude all possible values for type `Date` :)

## 3. `typeof`

Let's try another type guard. JavaScript provides `typeof` which we can place in front of any variable. As the name says, it will return the name of the variable's type as `string`… well not really. Otherwise we would have already reached the end of this article :).

In JavaScript, we have seven primitive types and the rest is just of type `object`. The primitive types are `boolean`, `string`, `number`, `undefined`, `null`, `bigint`, and `symbol`.

`typeof` returns the name of every primitive type, except for `null`. For `null` it returns 'object'. So one could assume that for `null` and any non-primitive type, we would get 'object'. But there is a second exception. `typeof` also returns 'function', if the variable is actually a `function` or if you pass the name of a `class`. Strictly speaking function is not a real type, it is a callable object.

With that knowledge, would the following code work?

```typescript
function calcAge(input: Date | null | undefined): number {
  if (typeof input === "object") {
    return diffInYears(input);
  }
}
```

No. Since `typeof` returns for `null` also 'object' the compilation will fail. So for now, we don't have any use for the `typeof` type guard, but let's keep it in mind. We might need it later.

## 4. Truthiness Narrowing

JavaScript invented two new English terms. Falsy and Truthy. If we put a falsy value into a condition, it will return `false` and `true` for a truthy value. There is an exhaustive list of falsy values in JavaScript. They are `false`, `0`, `0n`, `''`, `null`, `NaN`, and `undefined`.

We could use that to our advantage. If we put only the `input` into the `if` condition, it would be `true` if the value is not `undefined` or `null`. In our case, this is very similar to the equalness operator but just shorter.

```typescript
function calcAge(input: Date | null | undefined): number {
  if (input) {
    return diffInYears(input);
  }
}
```

We missed one tiny bit here. If the value is an empty string, it would also be false and we would not end up inside the `if`-condition. But that's OK for our use case, as long as we are aware of it.

Let's make our example more interesting. We add a fourth possible type which is a `string`. This is now the time where the `typeof` enters the game.

First, we get rid of the possibility that the value is `null` or `undefined` via truthiness narrowing and return the value 0 (we'll improve that later).

Then it is only between `Date` and `string`. And here we can use `typeof` to check if `input` is a `string`. If not, it can only be `Date`. Perfect!

```typescript
function calcAge(input: Date | null | undefined | string): number {
  if (!input) {
    return 0;
  } else if (typeof input === "string") {
    return diffInYears(parse(input));
  } else {
    return diffInYears(input);
  }
}
```

## 5. `instanceof`

There is also a possibility for type narrowing when we deal with classes. For that purpose, let's add a class `Person`, which has a property `birthday` of type `Date`.

```typescript
class Person {
  birthday = new Date();
}

function calcAge(input: Date | null | undefined | string | Person): number {
  if (!input) {
    return 0;
  } else if (typeof input === "string") {
    return diffInYears(parse(input));
  } else {
    return diffInYears(input); // failure: can be Date or Person
  }
}
```

Obviously,the last return in the `else` clause will fail because `input` can be of type `Date` or `Person`. The good message is though, that both are actually class instances and we can use `instanceof`.

`instanceof` returns `true` if a value is an instance of a particular class. So if we add a condition with a check for class `Date`, we are on the type-safe side again:

```typescript
function calcAge(input: Date | null | undefined | string | Person): number {
  if (!input) {
    return 0;
  } else if (typeof input === "string") {
    return diffInYears(parse(input));
  } else if (input instanceof Date) {
    return diffInYears(input);
  } else {
    return diffInYears(input.birthday);
  }
}
```

Be aware that `instanceof` returns `true` for the whole class inheritance chain. So if `Person` would extend from class `Entity`, `instanceof Entity` would also return true.

## 6. Discriminated Union

We use classes quite often, but more often we deal with object literals or - put in TypeScript jargon - interfaces or types.

Check out the slightly modified example:

```typescript
type Person = {
  birthday: Date;
  category: "person";
};

type Car = {
  yearOfConstruction: Date;
  category: "car";
};

function calcAge(
  input: Date | null | undefined | string | Person | Car
): number {
  if (!input) {
    return 0;
  } else if (typeof input === "string") {
    return diffInYears(parse(input));
  } else if (input instanceof Date) {
    return diffInYears(input);
  } else {
    return diffInYears(input.birthday); // Person | Car
  }
}
```

Ouch, again a compilation error. Can't we just use `instanceof` here as well? No. `Person` and `Car` are both only a `type` which is an element that only exists in TypeScript. When it is transpiled to JavaScript the definition of `Person` and `Car` is not there anymore. Classes, on the other hand, do also exist in JavaScript. That's why `instanceof` works for them.

Okay, so what can we do?

We are in a kind of lucky position. Both `Person` and `Car` share the same property `category` and each has a distinct value. By verifying if `category` has the value "car", TypeScript is smart enough to understand that it can only be of type `Car`. For `Person` the value would be 'person' obviously. The name of this type guard is "discriminated union". Let's fix our code again:

```typescript
function calcAge(
  input: Date | null | undefined | string | Person | Car
): number {
  if (!input) {
    return 0;
  } else if (typeof input === "string") {
    return diffInYears(parse(input));
  } else if (input instanceof Date) {
    return diffInYears(input);
  } else if (input.type === "Car") {
    return diffInYears(input.yearOfConstruction);
  } else {
    return diffInYears(input.birthday);
  }
}
```

We don't need to call the property for the discriminator `category`. We can pick whatever name we want.

## 7. `in` Type Guard

Consider the case where we are not so lucky to have a property that we can use as a discriminator value:

```typescript
type Person = {
  birthday: Date;
};

type Car = {
  yearOfConstruction: Date;
};

function calcAge(
  input: Date | null | undefined | string | Person | Car
): number {
  if (!input) {
    return 0;
  } else if (typeof input === "string") {
    return diffInYears(parse(input));
  } else if (input instanceof Date) {
    return diffInYears(input);
  } else if (input.type === "Car") {
    return diffInYears(input.yearOfConstruction);
  } else {
    return diffInYears(input.birthday);
  }
}
```

In such a case, we can make use of the `in` type guard. With `in` we can request, if an object has a certain property or not. So if it is between `Person` and `Car`, and the property `birthday` is present, the type can only be `Person`.

```typescript
type Person = {
  birthday: Date;
};

type Car = {
  yearOfConstruction: Date;
};

function calcAge(
  input: Date | null | undefined | string | Person | Car
): number {
  if (!value) {
    return 0;
  } else if (typeof input === "string") {
    return diffInYears(parse(input));
  } else if (input instanceof Date) {
    return diffInYears(input);
  } else if ("birthday" in input) {
    return diffInYears(input.birthday);
  } else {
    return diffInYears(input.yearOfConstruction);
  }
}
```

## 8. Type Predicate

Our next type guard is not a real type guard in that sense, it is some kind of a compromise.

First, let's replace the type `Car` with a type `PersonJson`. It has also a property `birthday` but it is of type `string`.

We could get away with it by `typeof value.birthday === 'string'`. This a combination of the `typeof` and the discriminated union type guard:

```typescript
type Person = {
  birthday: Date;
};

type PersonJson = {
  birthday: string;
};

function calcAge(
  input: Date | null | undefined | string | Person | PersonJson
): number {
  if (!input) {
    return 0;
  } else if (typeof input === "string") {
    return diffInYears(parse(input));
  } else if (input instanceof Date) {
    return diffInYears(input);
  } else if (typeof input.birthday === "string") {
    return diffInYears(parse(input.birthday));
  } else {
    return diffInYears(input.birthday);
  }
}
```

This code compiles and everything looks alright, but it is not perfect. If we would assign `input` to a new variable inside the last `else if` statement, we would see that TypeScript identifies the type not as `PersonJson` but as `Person | PersonJson`.

This is the point in time, where we reached the limits of TypeScript. Fortunately, it doesn't mean game over.

Whenever TypeScript runs out of options, it gives us the possibility to come up with a function that contains validation code for a particular type.

In a way, this is a compromise. We can write whatever we want in that function, as long as we return `true` or `false`. TypeScript will trust us.

This special function is called "type predicate" and for `Person` it looks like that:

```typescript
function isPerson(value: Person | PersonJson): value is Person {
  return value.birthday instanceof Date;
}
```

Please note the special notation where we normally have the return type.

We use the predicate as any other function and place it into the last `else if` condition:

```typescript
type Person = {
  birthday: Date;
};

type PersonJson = {
  birthday: string;
};

function isPerson(value: Person | PersonJson): value is Person {
  return value.birthday instanceof Date;
}

function calcAge(
  input: Date | null | undefined | string | Person | PersonJson
): number {
  if (!input) {
    return 0;
  } else if (typeof input === "string") {
    return diffInYears(parse(input));
  } else if (input instanceof Date) {
    return diffInYears(input);
  } else if (isPerson(input)) {
    return diffInYears(input.birthday);
  } else {
    return diffInYears(parse(input.birthday));
  }
}
```

## 9. Type Narrowing against `unknown`

With type predicates, we could even deal with variables of type `unknown`. Everything it takes, is to apply an `if` condition with the type predicate and voilà, problem gone.

But we have to be careful and shouldn't trick ourselves. The type narrowing is only as good as our validation logic.

If we would have a value of type `unknown` and we would like to verify if that has the "shape" of `Person` we would have to come up with a better code than the one we used before. By "shape", we mean any object literal or instance which has a property of `birthday: Date`.

### 9.1. Manual Validation

A type-safe type predicate would look like this:

```typescript
function isPerson(value: unknown): value is Person {
  return (
    typeof value === "object" &&
    value !== null &&
    "birthday" in value &&
    (value as { birthday: unknown }).birthday instanceof Date
  );
}
```

What a huge amount of code! Unfortunately, it is necessary if we want to be full type-safe.

The function shows another limitation of TypeScript's capabilities. Although we checked that `birthday` is a property of `value`, we still have to apply type assertion in the last condition to check if `birthday` is of type `Date`.

We can expect that over time TypeScript's limitations become less but at the moment it is what it is.

### 9.2. Automatic Validation: zod

We stay with type narrowing against the `unknown` type. Depending on the application type, we might quite often have to deal with the `unknown` type. Clearly, we don't want to write these huge type predicates all the time on our own. It takes quite a lot of precious time away.

Fortunately, it doesn't have to be like that. There are special libraries that do the validation automatically.

One of the most popular ones is "zod".

For every type, we have to come up with a schema first. This means we programmatically define the type and store it into a variable. So the schema information is also present during the runtime.

The generated schema is then used inside of a type predicate to validate if a value is of that type or not.

With zod, our `isPerson` would look like that:

```typescript
const personSchema = z.object({
  birthday: z.date(),
});

type Person = z.infer<typeof personSchema>;

function isPerson(value: unknown): value is Person {
  return personSchema.safeParse(value).success;
}
```

First, we define the schema and store it under `personSchema`. With an existing schema, we can ask zod to generate the type automatically for us. This works with `z.infer`. This simplifies things and also makes sure that we don't have double work when we change the `Person` type.

Last, we use the method `safeParse` which doesn't throw an error, if the value is not of type `Person`. It returns the result via the `success` property.

This is way much better than writing validation code manually all the time.

## 10. Assertion Functions

The last feature which is not a type guard, but comes in very handy, is the assertion function.

We return the number 0 in the first condition, when the type is `unknown`, `null`, or an empty string.

Returning number 0 is one way how to do it. The alternative is to throw an error.

If we throw an error, TypeScript's type narrowing will exclude `undefined` or `null` from the rest of the function's code.

An assertion function is a special function which does exactly do that. If we call it, it will - similar to the type guard - narrow down the parameter but it doesn't return a boolean. It guarantees us that it throws an error, if the value is not of the specific type.

Dealing with types that should not be `undefined` or `null` is so common, that TypeScript even provides a special type utility. It goes under the name `NonNullable<T>`. This type utility means, whatever type `T` is, it is not `undefined` or `null`. Let's see how `NonNullable<T>` and the assertion function work in action:

```typescript
function assertNonNullable<T>(value: T): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error("undefined or null are not allowed");
  }
}

function calcAge(
  input: Date | null | undefined | string | Person | PersonJson
): number {
  assertNonNullable(input);

  if (typeof input === "string") {
    return diffInYears(parse(input));
  } else if (input instanceof Date) {
    return diffInYears(input);
  } else if (isPerson(input)) {
    return diffInYears(input.birthday);
  } else {
    return diffInYears(parse(input.birthday));
  }
}
```

One final question must be allowed: When we throw an error, why don't we just remove them from the parameter's union type in the first place? Like `function calcAge(value: Date | string | Person | PersonJson): number {}`?

Well, because the caller might force us to include it. For example, in Angular, a form's input value is `undefined` when it is disabled. So we could of course say, that our program logic doesn't allow an `undefined` because we didn't provide a disable function. Nevertheless, the type of our form library has it and that's why it is among the parameter's types.

## 11. Summary

This article showed various techniques to deal with union types and how to narrow them down to one specific type. TypeScript is able to validate these patterns which means we are not trying to outsmart the compiler but produce code which is as much type-safe as possible.

We should always try to favour type narrowing over type assertion. It means more effort but we don't have to sacrifice type-safety.

Type-safety is actually the main reason, why we use TypeScript over JavaScript. We want to get as much type-safety as possible. From that perspective, the proper usage of type narrowing is the most important TypeScript skill for an application developer.
