import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SignupDto } from './signup.dto';

describe('SignupDto age gate', () => {
  const validBase = {
    email: 'student@example.com',
    username: 'student1',
    password: 'correct-horse-battery',
  };

  it('rejects an under-13 signup', async () => {
    const dto = plainToInstance(SignupDto, { ...validBase, age: 12 });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'age')).toBe(true);
  });

  it('accepts a 13-year-old signup', async () => {
    const dto = plainToInstance(SignupDto, { ...validBase, age: 13 });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
