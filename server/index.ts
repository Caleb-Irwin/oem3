import polka from 'polka';

const port = process.env.PORT ?? 3000

polka()
  .get('/', (req, res) => {
    res.end(`Hello World`);
  })
  .listen(port, () => {
    console.log(`> Running on :${port}`);
  });