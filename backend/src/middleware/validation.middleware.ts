import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

export const registerValidationRules = () => {
  return [
    body("username")
      .trim()
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters long"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Invalid email address"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ];
};

export const loginValidationRules = () => {
  return [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Invalid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ];
};

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const extractedErrors: { [key: string]: string }[] = [];
  errors.array().map((err) => {
    if (err.type === "field") {
      extractedErrors.push({ [err.path]: err.msg });
    }
  });

  return res.status(422).json({
    errors: extractedErrors,
  });
};
