class Path {

  moveTo(x, y) {
    this._steps.push(() => ({ x, y }));
  }
  lineTo(x, y) {

  }
}