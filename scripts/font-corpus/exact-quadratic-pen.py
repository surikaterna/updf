"""Analysis-only rational bounds for decomposed, quadratic TrueType outlines."""

from fractions import Fraction
import math

from fontTools.pens.basePen import BasePen


def rational_point(point, half_only=True):
    result = tuple(Fraction(value) for value in point)
    # The studied corpus witnesses use only integer/half-integer coordinates.
    # Fail instead of implying exact source-transform fidelity for other inputs.
    if half_only and any(value.denominator > 2 for value in result):
        raise ValueError("Analysis requires integer/half-integer outline points")
    return result


def axis_extremum(a, b, c):
    denominator = a - 2 * b + c
    if denominator == 0:
        return None
    t = (a - b) / denominator
    if not 0 < t < 1:
        return None
    return t, (a * c - b * b) / denominator


class ExactQuadraticPen(BasePen):
    def __init__(self, glyphs, half_only=True):
        super().__init__(glyphs)
        self.half_only = half_only
        self.candidates = [[], []]
        self.commands = []

    def add_point(self, point):
        point = rational_point(point, self.half_only)
        for axis, value in enumerate(point):
            self.candidates[axis].append({"value": value, "point": point})

    def _moveTo(self, point):
        self.add_point(point)
        self.commands.append({"command": "moveTo", "args": list(point)})

    def _lineTo(self, point):
        self.add_point(point)
        self.commands.append({"command": "lineTo", "args": list(point)})

    def _qCurveToOne(self, control, end):
        start = self._getCurrentPoint()
        points = [rational_point(p, self.half_only) for p in (start, control, end)]
        self.add_point(start)
        self.add_point(end)
        self.commands.append({"command": "quadraticCurveTo", "args": [*control, *end]})
        for axis in (0, 1):
            coordinates = [p[axis] for p in points]
            result = axis_extremum(*coordinates)
            if result:
                t, value = result
                self.candidates[axis].append({"value": value, "t": t,
                                              "coordinates": coordinates})

    def _curveToOne(self, *points):
        raise ValueError("Cubic outline outside this exact quadratic analysis")

    def _closePath(self):
        self.commands.append({"command": "closePath", "args": []})

    def _endPath(self):
        self.commands.append({"command": "closePath", "args": []})

    def extrema(self):
        return [min(self.candidates[0], key=lambda row: row["value"]),
                min(self.candidates[1], key=lambda row: row["value"]),
                max(self.candidates[0], key=lambda row: row["value"]),
                max(self.candidates[1], key=lambda row: row["value"])]

    def rounded(self):
        if not self.candidates[0]:
            return [0, 0, 0, 0]
        values = [row["value"] for row in self.extrema()]
        return [math.floor(values[0]), math.floor(values[1]),
                math.ceil(values[2]), math.ceil(values[3])]

    def witnesses(self):
        return [[row for row in self.candidates[edge % 2]
                 if "coordinates" in row and row["value"] == extremum["value"]]
                for edge, extremum in enumerate(self.extrema())]
