import polka from 'polka';

polka()
  .get('/', (req, res) => {
    res.end(`Hello World`);
  })
  .listen(3000, () => {
    console.log(`> Running on localhost:3000`);
  });