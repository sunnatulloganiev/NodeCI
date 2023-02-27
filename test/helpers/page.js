const puppeteer = require('puppeteer');
const sessionFactory = require('../factories/sessionFactory');
const userFactory = require('../factories/userFactory');

class CustomPage {
  static async build() {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
    });

    const page = await browser.newPage();

    const customPage = new CustomPage(page, browser);

    return new Proxy(customPage, {
      get(target, prop, receiver) {
        if (target[prop]) {
          return target[prop];
        }

        const value = page[prop];

        if (value instanceof Function) {
          return function (...args) {
            return value.apply(this === receiver ? page : this, args);
          };
        }

        return value;
      },
    });
  }

  constructor(page, browser) {
    this.page = page;
    this.browser = browser;
  }

  close() {
    this.browser.close();
  }

  async login() {
    const user = await userFactory();

    const { session, sig } = sessionFactory(user);

    await this.page.setCookie({ name: 'session', value: session });
    await this.page.setCookie({ name: 'session.sig', value: sig });

    await this.page.goto('http://localhost:3000/blogs');

    await this.page.waitForSelector('a[href="/auth/logout"]');
  }

  async getContentsOf(selector) {
    return await this.page.$eval(selector, (el) => el.innerHTML);
  }

  async click(selector) {
    const element = await this.page.waitForSelector(selector);
    await element.click();
  }

  async get(path) {
    return await this.page.evaluate(async (_path) => {
      const res = await fetch(_path, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return await res.json();
    }, path);
  }

  async post(path, data) {
    return await this.page.evaluate(
      async (_path, _body) => {
        const res = await fetch(_path, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(_body),
        });
        return await res.json();
      },
      path,
      data
    );
  }

  async execRequests(actions) {
    return Promise.all(
      actions.map(({ method, path, data }) => {
        return this[method](path, data);
      })
    );
  }
}

module.exports = CustomPage;
