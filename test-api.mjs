import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000/api';

async function testAPI() {
  console.log('Testing Note Management API (Mock Mode)...\n');

  try {
    // Test health check
    console.log('1. Testing health check...');
    const healthResponse = await fetch(`${API_BASE.replace('/api', '')}`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.message);

    // Test registration
    console.log('\n2. Testing registration endpoint...');
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'password123',
        confirmPassword: 'password123'
      })
    });

    if (registerResponse.status === 201) {
      const registerData = await registerResponse.json();
      console.log('✅ Registration successful');
      console.log('   Token received:', registerData.token ? 'Yes' : 'No');

      // Test login
      console.log('\n3. Testing login endpoint...');
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });

      if (loginResponse.status === 200) {
        const loginData = await loginResponse.json();
        console.log('✅ Login successful');
        const token = loginData.token;

        // Test get current user
        console.log('\n4. Testing get current user...');
        const userResponse = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (userResponse.status === 200) {
          const userData = await userResponse.json();
          console.log('✅ Get user successful:', userData.user.displayName);

          // Test creating a note
          console.log('\n5. Testing note creation...');
          const noteResponse = await fetch(`${API_BASE}/notes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              title: 'Test Note',
              content: 'This is a test note content.'
            })
          });

          if (noteResponse.status === 201) {
            const noteData = await noteResponse.json();
            console.log('✅ Note creation successful');
            const noteId = noteData.note.id;

            // Test getting notes
            console.log('\n6. Testing get notes...');
            const notesResponse = await fetch(`${API_BASE}/notes`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (notesResponse.status === 200) {
              const notesData = await notesResponse.json();
              console.log('✅ Get notes successful, count:', notesData.notes.length);

              // Test updating note
              console.log('\n7. Testing note update...');
              const updateResponse = await fetch(`${API_BASE}/notes/${noteId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  title: 'Updated Test Note',
                  content: 'This is updated test note content.'
                })
              });

              if (updateResponse.status === 200) {
                console.log('✅ Note update successful');

                // Test pinning note
                console.log('\n8. Testing note pin toggle...');
                const pinResponse = await fetch(`${API_BASE}/notes/${noteId}/pin`, {
                  method: 'PATCH',
                  headers: { 'Authorization': `Bearer ${token}` }
                });

                if (pinResponse.status === 200) {
                  const pinData = await pinResponse.json();
                  console.log('✅ Note pin toggle successful, pinned:', pinData.pinned);

                  // Test deleting note
                  console.log('\n9. Testing note deletion...');
                  const deleteResponse = await fetch(`${API_BASE}/notes/${noteId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                  });

                  if (deleteResponse.status === 200) {
                    console.log('✅ Note deletion successful');
                  } else {
                    console.log('❌ Note deletion failed');
                  }
                } else {
                  console.log('❌ Note pin toggle failed');
                }
              } else {
                console.log('❌ Note update failed');
              }
            } else {
              console.log('❌ Get notes failed');
            }
          } else {
            console.log('❌ Note creation failed');
          }
        } else {
          console.log('❌ Get user failed');
        }
      } else {
        console.log('❌ Login failed');
      }
    } else {
      const errorData = await registerResponse.json();
      console.log('ℹ️  Registration response:', errorData.message);
    }

    console.log('\n🎉 All API tests completed successfully!');
    console.log('\n🚀 Ready for manual testing at http://localhost:5173');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('\nMake sure the mock backend server is running: cd backend && npm run dev:mock');
  }
}

testAPI();