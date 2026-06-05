import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'

import { AuthProvider } from '../auth/AuthContext'
import StudentPortal from './StudentPortal'

vi.mock('../api/client', () => ({
  api: {
    me: vi.fn().mockResolvedValue({
      user: {
        id: 'u1',
        email: 'student@example.com',
        name: 'Student',
        role: 'STUDENT',
        is_active: true,
        created_at: new Date().toISOString(),
      },
    }),
    myComplaints: vi.fn().mockResolvedValue([]),
  },
}))

describe('StudentPortal', () => {
  it('renders the complaint form', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <StudentPortal />
        </AuthProvider>
      </BrowserRouter>,
    )

    expect(await screen.findByText('Tell us what happened')).toBeInTheDocument()
    expect(screen.getByLabelText('Hostel')).toBeInTheDocument()
    expect(screen.getByLabelText('Complaint')).toBeInTheDocument()
  })
})
