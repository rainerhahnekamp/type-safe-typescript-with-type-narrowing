import { z } from "zod";

declare function diffInYears(value: Date): number;
declare function parse(value: string): Date;

const personSchema = z.object({
  birthday: z.date(),
});

type Person = z.infer<typeof personSchema>;

function isPerson(value: unknown): value is Person {
  return personSchema.safeParse(value).success;
}

type PersonJson = {
  birthday: string;
};

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
