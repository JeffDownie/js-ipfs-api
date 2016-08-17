'use strict'

const DAGNode = require('ipfs-merkle-dag').DAGNode
const bl = require('bl')
const parallel = require('async/parallel')

module.exports = function (send, hash, cb) {
  // Retrieve the object and its data in parallel, then produce a DAGNode
  // instance using this information.
  parallel([
    function get (done) {
      send('object/get', hash, null, null, done)
    },

    function data (done) {
      // WORKAROUND: request the object's data separately, since raw bits in JSON
      // are interpreted as UTF-8 and corrupt the data.
      // See https://github.com/ipfs/go-ipfs/issues/1582 for more details.
      send('object/data', hash, null, null, done)
    }],

    function done (err, res) {
      if (err) {
        return cb(err)
      }

      var object = res[0]
      var stream = res[1]

      if (Buffer.isBuffer(stream)) {
        cb(err, new DAGNode(stream, object.Links))
      } else {
        stream.pipe(bl(function (err, data) {
          if (err) {
            return cb(err)
          }

          cb(err, new DAGNode(data, object.Links))
        }))
      }
    })
}
