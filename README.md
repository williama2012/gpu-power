# gpu-power

A Node.js script that continuously monitors NVIDIA GPU power draw and logs the data to a MongoDB database.

## How It Works

`gpu-power-log.js` uses `nvidia-smi` to query GPU power consumption (in watts) every **1 second** and inserts each reading into MongoDB.

### What gets logged

Each log record contains:

| Field        | Type                | Description                              |
|--------------|--------------------|------------------------------------------|
| `timestamp`  | `Date`             | When the sample was taken                |
| `draw`       | `Number`           | Total power draw across all GPUs (W)     |
| `gpu_name`   | `Array<string>`    | Names of all detected GPUs               |
| `gpu_draw`   | `Array<Number>`    | Power draw per GPU in watts              |
