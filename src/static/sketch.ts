///<reference path="thermoClient.ts"/>
declare const p5

const thermoSketch = new p5(p => {

  let stateRecords = []

  p.setup = () => {
    const vis = $('#visualization')
    p.createCanvas(vis.width(), vis.height()).parent('visualization')
  }

  p.draw = () => {
    p.frameRate(0.5)
    p.background('#e0e0e0')
    p.translate(0, p.height)
    p.scale(1, -1)

    if (stateRecords.length === 0) return

    function minOrMax(fn, iv) {
      const rf = (a, c) => fn(a, c.current_temp, c.desired_temp, c.outside_temp)
      return stateRecords.reduce(rf, iv)
    }

    const y_axis_margin_degrees = 1
    const temp_min = minOrMax(Math.min,  50) - y_axis_margin_degrees
    const temp_max = minOrMax(Math.max, -50) + y_axis_margin_degrees
    const chartYBase = 20

    let timeStart = stateRecords[0].time
    let timeEnd = p.int(Date.now() / 1000)

    let xRight = p.width - 20

    const tempToY = y => p.map(y, temp_min, temp_max, chartYBase, p.height)

    function timeToX(time) {
      const secondsFromEnd = timeEnd - time
      const pixelsFromEnd = secondsFromEnd / thermoClient.sliceSecs
      return xRight - pixelsFromEnd
    }

    function drawVertGridLines() {
      const gridLow = Math.floor(temp_min)
      const gridHigh = Math.ceil(temp_max)
      const smallRange = gridHigh - gridLow < 5

      for (let gt = gridLow; gt < gridHigh; gt++) {
        const gly = tempToY(gt)
        p.strokeWeight(1)
        p.stroke(200)
        p.line(0, gly, p.width, gly)

        if (smallRange || gt % 5 === 0) {
          p.push()
          p.scale(1, -1)
          p.strokeWeight(1)
          p.textAlign(p.RIGHT, p.CENTER)
          p.textStyle(p.NORMAL)
          p.text(gt, p.width - 3, -gly)
          p.pop()
        }
      }
    }

    function drawHorzGridLines() {
      const fifteenMins = 60 * 15
      const sixtyMins = 60 * 60
      const firstLineTime = timeStart - timeStart % fifteenMins + fifteenMins

      for (let lineTime = firstLineTime; lineTime < timeEnd; lineTime += fifteenMins) {
        const lineX = timeToX(lineTime)
        const is60MinMultiple = lineTime % sixtyMins === 0
        p.strokeWeight(is60MinMultiple ? 2 : 1)
        p.stroke(128)
        p.line(lineX, chartYBase, lineX, p.height)
        if (is60MinMultiple) {
          p.push()
          p.scale(1, -1)
          p.textAlign(p.CENTER, p.BOTTOM)
          p.strokeWeight(0)
          p.text(new Date(lineTime * 1000).getHours(), lineX, 0)
          p.pop()
        }
      }
    }

    drawVertGridLines()
    drawHorzGridLines()

    for (let i = stateRecords.length - 1; i >= 0; --i) {
      const rec = stateRecords[i]
      const x = timeToX(rec.time)
      if (x < 0) break

      const prevRec = i >= 1 ? stateRecords[i - 1] : null
      const prevX = prevRec ? timeToX(prevRec.time) : null

      p.strokeWeight(3)
      p.stroke('blue')
      if (prevRec) {
        const prevTempY = tempToY(prevRec.current_temp);
        p.line(x, prevTempY, prevX, prevTempY)
      }
      p.point(x, tempToY(rec.current_temp))

      p.stroke('green')
      const desiredTempY = tempToY(rec.desired_temp);
      if (prevRec && prevRec.desired_temp === rec.desired_temp) {
        const prevX = timeToX(prevRec.time)
        p.line(x, desiredTempY, prevX, desiredTempY)
      } else p.point(x, desiredTempY)

      p.strokeWeight(6)
      p.stroke(255, 190, 0)
      p.point(timeToX(rec.outside_temp_collection_time), tempToY(rec.outside_temp))
      p.strokeWeight(3)

      if (rec.heater_is_on) {
        p.stroke('#9C2A00')
        p.point(x, chartYBase - 6)
      }
    }
  }

  p.addStateRecord = record => stateRecords.push(record)
  p.addAllStateRecords = records => stateRecords = records
})

const thermoClient = new ThermoClient(thermoSketch)
