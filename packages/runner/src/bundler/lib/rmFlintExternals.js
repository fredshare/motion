const externals = [ 'flint-js', 'react', 'react-dom', 'bluebird' ]

export default function rmFlintExternals(ls) {
  return ls.filter(i => externals.indexOf(i) < 0)
}