module.exports = assert => ({
  equal: actual => {
    return expected => {
      assert.equal(actual.valueOf(), expected.valueOf());
      return true;
    };
  }
});
