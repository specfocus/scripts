import yargs from'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { nanoid } from 'nanoid/non-secure'

const [command, ...packages] = process.argv.slice(2)
const argv = yargs(hideBin(process.argv));

export const config = () => {
  return argv.config();
};

export default argv;
