interface Sketch {
  addAllStateRecords: (string) => void
  addStateRecord:     (string) => void
}

interface State {
  current_temp:     number
  desired_temp:     number
  outside_temp:     number
  wind_dir:         number
  wind_speed:       number
  gust:             number
  pressure:         number
  main_weather:     [{
    icon: string
    description: string
  }]
  humidity:         number
  outside_humidity: number
}

class ThermoClient {
  public sliceSecs: number
  private eventSource: EventSource

  constructor(private sketch: Sketch) {
    this.sliceSecs = 15
    this.inEl('zoom').value = this.sliceSecs.toString()
    this.setUpEventProcessing()
    document.addEventListener("visibilitychange", () => {
      this.visibilityChanged(!document.hidden)
    }, false)
  }

  private setUpEventProcessing() {
    fetch('all-status').then(r => r.json()).then(j => this.sketch.addAllStateRecords(j))
    const source = this.eventSource = new EventSource('/status')
    console.log(`Created EventSource. readyState: ${source.readyState}`)
    source.onopen = parm => console.log(parm, source.readyState)
    source.onmessage = event => this.processEvent(JSON.parse(event.data))
    source.onerror = error => console.error('Status events error', error, source.readyState)
  }

  private processEvent(state: State) {
    console.log('event arrived')
    this.sketch.addStateRecord(state)
    const set = (id: string, text: any) => document.getElementById(id).textContent = text

    set('outside-temperature', state.outside_temp.toFixed(2))
    set('wind-dir',            state.wind_dir.toFixed(0))
    set('wind-speed',          state.wind_speed.toFixed(0))
    set('gust',                state.gust == 0 ? '' : ` (g. ${state.gust.toFixed(0)})`)
    set('temperature',         state.current_temp.toFixed(1))
    set('pressure',            state.pressure.toFixed(0))
    set('humidity',            state.humidity.toFixed(0))
    set('outside-humidity',    state.outside_humidity.toFixed(0))
    set('display-desired',     state.desired_temp.toFixed(1))

    const mwElem = document.getElementById('main-weather')
    mwElem.innerHTML = ''
    state.main_weather.forEach(mw => {
      const img = document.createElement('img')
      img.src = `http://openweathermap.org/img/wn/${mw.icon}.png`
      img.alt = img.title = mw.description
      mwElem.appendChild(img)
    });
  }

  adjustTemp(amount: number) {
    fetch('increase_temperature', {
      method: 'POST',
      body: amount.toString()
    }).then(response => response)
  }

  activateFan(activate: string) {
    fetch('activate_fan', {
      method: 'PUT',
      body: activate
    }).then(response => response)
  }

  enableCool(enable: string) {
    fetch('enable_cool', {
      method: 'PUT',
      body: enable
    }).then(response => response)
  }

  schedule() {
    fetch('schedule', {
      method: 'PUT',
      body: this.inEl('schedule').value
    }).then(response => response)
  }

  private zoom() {
    this.sliceSecs = Number(this.inEl('zoom').value)
  }

  private visibilityChanged(visible) {
    const rs = this.eventSource.readyState
    console.log(`vis changed to ${visible}. eventSource.readyState: ${rs}`)
    if (visible && rs === 2 /* closed */) {
      this.setUpEventProcessing()
    }
  }

  private inEl(selector: string) {
    return <HTMLInputElement>document.getElementById(selector)
  }
}
