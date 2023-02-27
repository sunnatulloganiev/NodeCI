const Page = require('./helpers/page');

let page;

beforeEach(async () => {
  page = await Page.build();
  await page.goto('http://localhost:3000');
});

afterEach(async () => {
  await page.close();
});

describe('When logged in', () => {
  beforeEach(async () => {
    await page.login();
    await page.click('a.btn-floating');
  });

  test('Can see blog create form', async () => {
    const label = await page.getContentsOf(
      '#root > div > div > div > div > form > div.title > label'
    );

    expect(label).toEqual('Blog Title');
  });

  describe('And using invalid inputs', () => {
    beforeEach(async () => {
      await page.click('form button');
    });

    test('the form shows an error message', async () => {
      const titleError = await page.getContentsOf('.title .red-text');
      const contentError = await page.getContentsOf('.content .red-text');

      expect(titleError).toEqual('You must provide a value');
      expect(contentError).toEqual('You must provide a value');
    });
  });

  describe('And using valid inputs', () => {
    beforeEach(async () => {
      await page.type('.title input', 'My Title');
      await page.type('.content input', 'My Content');
      await page.click('form button');
    });

    test('should Submittin takes user to review screen', async () => {
      const text = await page.getContentsOf('h5');

      expect(text).toEqual('Please confirm your entries');
    });

    test('Submittin then saving adds blog to index page', async () => {
      await page.click('button.green');
      await page.waitForSelector('.card');

      const title = await page.getContentsOf('.card-title');
      const content = await page.getContentsOf('p');

      expect(title).toEqual('My Title');
      expect(content).toEqual('My Content');
    });
  });
});

describe('User is not logged in', () => {
  // test('User cannot create blog posts', async () => {
  //   const result = await page.post('/api/blogs', {
  //     title: 'My Title',
  //     content: 'My Content',
  //   });

  //   expect(result).toEqual({ error: 'You must log in!' });
  // });

  // test('User cannot get blog posts', async () => {
  //   const result = await page.get('/api/blogs');

  //   expect(result).toEqual({ error: 'You must log in!' });
  // });

  const actions = [
    {
      method: 'get',
      path: 'api/blogs',
    },
    {
      method: 'post',
      path: 'api/blogs',
      data: {
        title: 'T',
        content: 'C',
      },
    },
  ];

  test('Blog related actions are prohibited', async () => {
    const results = await page.execRequests(actions);

    for (const result of results) {
      expect(result).toEqual({error: 'You must log in!'})
    }
  });
});
