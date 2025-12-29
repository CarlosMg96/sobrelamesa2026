
import axios from 'axios';

// for testing use npx ts-node tests/scripts/verify-auth.ts

const API_URL = 'http://localhost:3000/api/auth';
const TEST_EMAIL = 'isa@mail.com';
const TEST_PASSWORD = '753159'; // Ensure this matches a user in your DB

async function verifyAuthFlow() {
    try {
        console.log('--- Starting Auth Verification ---');

        // 1. Login
        console.log('\n1. Testing Login...');
        const loginRes = await axios.post(`${API_URL}/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });

        const { accessToken, refreshToken } = loginRes.data.data;
        if (!accessToken || !refreshToken) {
            throw new Error('Login failed: Missing tokens');
        }
        console.log('✅ Login successful');
        console.log('Access Token:', accessToken.substring(0, 20) + '...');
        console.log('Refresh Token:', refreshToken.substring(0, 20) + '...');

        // 2. Access Protected Route (Profile) with Access Token
        console.log('\n2. Testing Access Token (Profile)...');
        try {
            const profileRes = await axios.get(`${API_URL}/profile`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            console.log('✅ Access Token valid. Profile:', profileRes.data.user.email);
        } catch (error) {
            console.error('❌ Access Token failed:', (error as any).response?.data || (error as any).message);
        }

        // 3. Refresh Token
        console.log('\n3. Testing Refresh Token...');
        const refreshRes = await axios.post(`${API_URL}/refresh`, {
            refreshToken
        });
        const newAccessToken = refreshRes.data.data.accessToken;
        const newRefreshToken = refreshRes.data.data.refreshToken;

        if (!newAccessToken) {
            throw new Error('Refresh failed: Missing new access token');
        }
        console.log('✅ Refresh successful');
        console.log('New Access Token:', newAccessToken.substring(0, 20) + '...');
        console.log('New Refresh Token:', newRefreshToken.substring(0, 20) + '...');

        // 4. Logout
        console.log('\n4. Testing Logout...');
        // Note: My implementation requires Authentication header for logout AND expects user to be identifiable.
        // Wait, my implementation uses `req.user.id` so I MUST send the Access Token (or a valid one).
        // Let's use the NEW access token.
        await axios.post(`${API_URL}/logout`, {}, {
            headers: { Authorization: `Bearer ${newAccessToken}` }
        });
        console.log('✅ Logout successful');

        // 5. Verify Refresh Token is invalidated
        console.log('\n5. Verifying Refresh Token Invalidation...');
        try {
            await axios.post(`${API_URL}/refresh`, {
                refreshToken: newRefreshToken
            });
            console.error('❌ Refresh Token should be invalid but it worked!');
        } catch (error) {
            if ((error as any).response?.status === 401) {
                console.log('✅ Old Refresh Token correctly rejected');
            } else {
                console.error('❌ Unexpected error code:', (error as any).response?.status);
            }
        }

        console.log('\n--- Verification Complete ---');

    } catch (error) {
        console.error('\n❌ Verification Failed:', (error as any).message);
        if ((error as any).response) {
            console.error('Response:', (error as any).response.data);
        }
    }
}

verifyAuthFlow();
