// TODO: Implement
import bcrypt from "bcryptjs";

export const comparePassword = (plain, hash) => {
  return bcrypt.compare(plain, hash);
};
