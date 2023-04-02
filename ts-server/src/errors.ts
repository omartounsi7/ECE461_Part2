class InvalidRequestError extends Error {
    statusCode: number;
    constructor(message: string) {
      super(message);
      this.name = 'InvalidRequestError';
      this.statusCode = 400;
    }
  }

class AuthenticationError extends Error {
    statusCode: number;
    constructor(message: string) {
      super(message);
      this.name = 'AuthenticationError';
      this.statusCode = 403;
    }
  }

class PackageAlreadyExistsError extends Error {
    statusCode: number;
    constructor(message: string) {
      super(message);
      this.name = 'PackageAlreadyExistsError';
      this.statusCode = 409;
    }
  }

class PackageDisqualificationError extends Error {
    statusCode: number;
    constructor(message: string) {
      super(message);
      this.name = 'PackageDisqualificationError';
      this.statusCode = 424;
    }
  }

class UserNotAuthorized extends Error {
    statusCode: number;
    constructor(message: string) {
      super(message);
      this.name = 'UserNotAuthorized';
      this.statusCode = 401;
    }
  }


class InvalidUsernameOrPassword extends Error {
    statusCode: number;
    constructor(message: string) {
      super(message);
      this.name = 'InvalidUsernameOrPassword';
      this.statusCode = 401;
    }
  }


class PackageDoesNotExist extends Error {
    statusCode: number;
    constructor(message: string) {
      super(message);
      this.name = 'PackageDoesNotExist';
      this.statusCode = 404;
    }
  }

class TooManyPackagesReturned extends Error {
    statusCode: number;
    constructor(message: string) {
      super(message);
      this.name = 'TooManyPackagesReturned';
      this.statusCode = 413;
    }
  }

class PackageChokedOnMetric extends Error {
    statusCode: number;
    constructor(message: string) {
      super(message);
      this.name = 'PackageChokedOnMetric';
      this.statusCode = 500;
    }
  }