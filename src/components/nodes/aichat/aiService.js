import { spawn } from 'child_process'

export const executeAICommand = async (prompt, onStream) => {
    return new Promise((resolve, reject) => {
        const command = 'npx'
        const args = ['tsx', 'scripts/generate-in-daytona.ts', '8c9cfa1d-c054-4c29-84d6-d1eda254123a', prompt]
        
        const process = spawn(command, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
        })

        let output = ''
        let errorOutput = ''

        process.stdout.on('data', (data) => {
            const chunk = data.toString()
            output += chunk
            if (onStream) {
                onStream(chunk)
            }
        })

        process.stderr.on('data', (data) => {
            errorOutput += data.toString()
        })

        process.on('close', (code) => {
            if (code === 0) {
                resolve(output)
            } else {
                reject(new Error(`Command failed with code ${code}: ${errorOutput}`))
            }
        })

        process.on('error', (error) => {
            reject(error)
        })
    })
}