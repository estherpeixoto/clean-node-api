const LoginRouter = require('./login-router')
const InvalidParamError = require('../helpers/invalid-param-error')
const MissingParamError = require('../helpers/missing-param-error')
const UnauthorizedError = require('../helpers/unauthorized-error')
const ServerError = require('../helpers/server-error')

const makeEmailValidator = () => {
  class EmailValidatorSpy {
    isValid (email) {
      return this.isEmailValid
    }
  }

  const emailValidatorSpy = new EmailValidatorSpy()
  emailValidatorSpy.isEmailValid = true
  return emailValidatorSpy
}

const makeAuthUseCase = () => {
  class AuthUseCaseSpy {
    async auth (email, password) {
      this.email = email
      this.password = password

      return this.accessToken
    }
  }

  return new AuthUseCaseSpy()
}

const makeAuthUseCaseWithError = () => {
  class AuthUseCaseSpy {
    async auth () {
      throw new Error()
    }
  }

  return new AuthUseCaseSpy()
}

const makeEmailValidatorWithError = () => {
  class EmailValidatorSpy {
    isValid () {
      throw new Error()
    }
  }

  return new EmailValidatorSpy()
}

const makeSut = () => {
  const authUseCaseSpy = makeAuthUseCase()
  const emailValidatorSpy = makeEmailValidator()

  authUseCaseSpy.accessToken = 'valid token'

  const sut = new LoginRouter(authUseCaseSpy, emailValidatorSpy)

  return { sut, authUseCaseSpy, emailValidatorSpy }
}

describe('Login Router', () => {
  test('Should return 500 if no httpRequest is provided', async () => {
    const { sut } = makeSut()

    const httpResponse = await sut.route()

    expect(httpResponse.statusCode).toBe(500)
    expect(httpResponse.body).toEqual(new ServerError())
  })

  test('Should return 500 if no httpRequest has no body', async () => {
    const { sut } = makeSut()

    const httpRequest = {}
    const httpResponse = await sut.route(httpRequest)

    expect(httpResponse.statusCode).toBe(500)
    expect(httpResponse.body).toEqual(new ServerError())
  })

  test('Should return 400 if no email is provided', async () => {
    const { sut } = makeSut()

    const httpRequest = {
      body: {
        password: 'any password'
      }
    }

    const httpResponse = await sut.route(httpRequest)

    expect(httpResponse.statusCode).toBe(400)
    expect(httpResponse.body).toEqual(new MissingParamError('email'))
  })

  test('Should return 400 if no password is provided', async () => {
    const { sut } = makeSut()

    const httpRequest = {
      body: {
        email: 'any_email@mail.com'
      }
    }

    const httpResponse = await sut.route(httpRequest)

    expect(httpResponse.statusCode).toBe(400)
  })

  test('Should call AuthUseCaseSpy with correct params', async () => {
    const { sut, authUseCaseSpy } = makeSut()

    const httpRequest = {
      body: {
        email: 'any_email@mail.com',
        password: 'any password'
      }
    }

    await sut.route(httpRequest)

    expect(authUseCaseSpy.email).toBe(httpRequest.body.email)
    expect(authUseCaseSpy.password).toBe(httpRequest.body.password)
  })

  test('Should return 401 when invalid credentials are provided', async () => {
    const { sut, authUseCaseSpy } = makeSut()

    authUseCaseSpy.accessToken = null

    const httpRequest = {
      body: {
        email: 'invalid_email@mail.com',
        password: 'invalid password'
      }
    }

    const httpResponse = await sut.route(httpRequest)

    expect(httpResponse.statusCode).toBe(401)
    expect(httpResponse.body).toEqual(new UnauthorizedError())
  })

  test('Should return 200 when valid credentials are provided', async () => {
    const { sut, authUseCaseSpy } = makeSut()

    const httpRequest = {
      body: {
        email: 'valid_email@mail.com',
        password: 'valid password'
      }
    }

    const httpResponse = await sut.route(httpRequest)

    expect(httpResponse.statusCode).toBe(200)
    expect(httpResponse.body.accessToken).toEqual(authUseCaseSpy.accessToken)
  })

  test('Should return 500 if no AuthUseCase is provided', async () => {
    const sut = new LoginRouter()

    const httpRequest = {
      body: {
        email: 'any_email@mail.com',
        password: 'any password'
      }
    }

    const httpResponse = await sut.route(httpRequest)

    expect(httpResponse.statusCode).toBe(500)
    expect(httpResponse.body).toEqual(new ServerError())
  })

  test('Should return 500 if no AuthUseCase has no auth method', async () => {
    class AuthUseCaseSpy {}
    const authUseCaseSpy = new AuthUseCaseSpy()

    const sut = new LoginRouter(authUseCaseSpy)

    const httpRequest = {
      body: {
        email: 'any_email@mail.com',
        password: 'any password'
      }
    }

    const httpResponse = await sut.route(httpRequest)

    expect(httpResponse.statusCode).toBe(500)
    expect(httpResponse.body).toEqual(new ServerError())
  })

  test('Should return 500 if no AuthUseCase throws', async () => {
    const authUseCaseSpy = makeAuthUseCaseWithError()

    const sut = new LoginRouter(authUseCaseSpy)

    const httpRequest = {
      body: {
        email: 'any_email@mail.com',
        password: 'any password'
      }
    }

    const httpResponse = await sut.route(httpRequest)

    expect(httpResponse.statusCode).toBe(500)
  })

  test('Should return 400 if an invalid email is provided', async () => {
    const { sut, emailValidatorSpy } = makeSut()

    emailValidatorSpy.isEmailValid = false

    const httpRequest = {
      body: {
        email: 'invalid_email@mail.com',
        password: 'any password'
      }
    }

    const httpResponse = await sut.route(httpRequest)

    expect(httpResponse.statusCode).toBe(400)
    expect(httpResponse.body).toEqual(new InvalidParamError('email'))
  })

  test('Should return 500 if no EmailValidator is provided', async () => {
    const authUseCaseSpy = makeAuthUseCase()
    const sut = new LoginRouter(authUseCaseSpy)

    const httpRequest = {
      body: {
        email: 'any_email@mail.com',
        password: 'any password'
      }
    }

    const httpResponse = await sut.route(httpRequest)

    expect(httpResponse.statusCode).toBe(500)
    expect(httpResponse.body).toEqual(new ServerError())
  })

  test('Should return 500 if no EmailValidator has no isValid method', async () => {
    const authUseCaseSpy = makeAuthUseCase()
    const sut = new LoginRouter(authUseCaseSpy, {})

    const httpRequest = {
      body: {
        email: 'any_email@mail.com',
        password: 'any password'
      }
    }

    const httpResponse = await sut.route(httpRequest)

    expect(httpResponse.statusCode).toBe(500)
    expect(httpResponse.body).toEqual(new ServerError())
  })

  test('Should return 500 if EmailValidator throws', async () => {
    const authUseCaseSpy = makeAuthUseCaseWithError()
    const emailValidatorSpy = makeEmailValidatorWithError()

    const sut = new LoginRouter(authUseCaseSpy, emailValidatorSpy)

    const httpRequest = {
      body: {
        email: 'any_email@mail.com',
        password: 'any password'
      }
    }

    const httpResponse = await sut.route(httpRequest)

    expect(httpResponse.statusCode).toBe(500)
  })
})
