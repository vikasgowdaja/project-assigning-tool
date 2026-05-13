import os from 'os'

export const getLanIPv4Addresses = () => {
  const interfaces = os.networkInterfaces()
  const addresses = []

  for (const name of Object.keys(interfaces)) {
    const records = interfaces[name] || []
    for (const record of records) {
      if (record.family === 'IPv4' && !record.internal) {
        addresses.push(record.address)
      }
    }
  }

  return addresses
}
