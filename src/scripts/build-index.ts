import { rebuildIndex } from '../storage/index-builder';

rebuildIndex()
  .then(() => {
    console.log('Index rebuilt successfully.');
  })
  .catch((err) => {
    console.error('Failed to rebuild index:', err);
    process.exit(1);
  });
