import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import App from './App'

describe('App', () => {
  it('renders the safe P0 landing page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'ok',
            environment: 'development',
            unsafeLabEnabled: false,
          }),
      }),
    )

    render(<App />)
    expect(
      screen.getByRole('heading', { name: 'QueryShield Lab' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('API đang hoạt động')).toBeInTheDocument()
  })
})
