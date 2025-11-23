# ✅ QR CODE PORT MISMATCH FIX

## 🎯 THE PROBLEM

**QR Code URL:** `http://192.168.0.111:3000/tukconnect-v2/verify-visitor/115`
**App Running On:** `http://localhost:3001/tukconnect-v2/`

**Port Mismatch:**
- QR code uses port **3000** ❌
- App runs on port **3001** ✅
- Result: Can't connect → "Invitation not found"

---

## 🔧 IMMEDIATE FIX

### Step 1: Hard Refresh the Browser

**CRITICAL: You MUST clear the cached JavaScript!**

**On Windows:**
```
Press: Ctrl + Shift + R
Or: Ctrl + F5
```

**On Mac:**
```
Press: Cmd + Shift + R
Or: Cmd + Option + R
```

**Or use DevTools:**
```
1. Open DevTools (F12)
2. Right-click on refresh button
3. Select "Empty Cache and Hard Reload"
```

### Step 2: Verify Page Refreshed

**Check the browser console:**
```
1. Press F12 to open DevTools
2. Go to Console tab
3. Should see: "App starting up - restored"
4. Check for any errors
```

### Step 3: Create NEW Invitation

**IMPORTANT: Must create AFTER hard refresh!**

```
1. Go to Visitor Invitation page
2. Click "Autofill" button
3. Click "Generate Invitation"
4. Wait for success message
```

### Step 4: Check QR Code URL

**Before scanning, verify the URL:**

**Method 1: Inspect QR Code**
```
1. Click "Show QR" on new invitation
2. Right-click on page
3. Select "Inspect" or "Inspect Element"
4. Look in Console for any logs
5. Or check Network tab for the URL being generated
```

**Method 2: Test URL Directly**
```
1. Copy the invitation ID from the list
2. Open new browser tab
3. Go to: http://192.168.0.111:3001/tukconnect-v2/verify-visitor/{paste-id}
4. Should show visitor details
5. If this works, QR code will work
```

### Step 5: Scan QR Code

```
1. Make sure phone on same WiFi
2. Scan the QR code
3. Should open: http://192.168.0.111:3001/tukconnect-v2/verify-visitor/{id}
4. ✅ Should show visitor details
```

---

## 🔍 VERIFICATION CHECKLIST

Before scanning QR code:

- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Cleared cache
- [ ] Created NEW invitation AFTER refresh
- [ ] App running on port 3001 (check terminal)
- [ ] Phone on same WiFi as computer
- [ ] Tested URL directly in browser first

---

## 💡 WHY THIS HAPPENS

### Browser Caching

**The Issue:**
```
1. Old JavaScript cached in browser
2. Old code uses port 3000
3. New code uses port 3001
4. Browser still runs old cached code
5. QR code generated with wrong port
```

**The Fix:**
```
1. Hard refresh clears cache
2. Browser loads new JavaScript
3. New code uses window.location.port (3001)
4. QR code generated with correct port
5. Everything works!
```

---

## 🧪 TESTING

### Test 1: Verify Current Port

**Check terminal output:**
```
VITE v6.4.1  ready in 182 ms

➜  Local:   http://localhost:3001/tukconnect-v2/
➜  Network: http://192.168.0.111:3001/tukconnect-v2/
```

**Port should be 3001!**

### Test 2: Verify Browser URL

**Check address bar:**
```
Should be: http://localhost:3001/tukconnect-v2/visitor-invitation
Not:       http://localhost:3000/tukconnect-v2/visitor-invitation
```

### Test 3: Test Direct Access

**Before creating QR code:**
```
1. Create invitation
2. Note the invitation ID (e.g., "abc-123-def")
3. Open in browser: http://192.168.0.111:3001/tukconnect-v2/verify-visitor/abc-123-def
4. Should show visitor details
5. If this works, QR code will work
```

---

## 🎊 SUMMARY

**Problem:** QR code uses port 3000, app runs on 3001
**Cause:** Browser cached old JavaScript
**Solution:** Hard refresh browser + create new invitation
**Result:** ✅ QR code will use correct port (3001)

---

## 🚀 ACTION STEPS

**DO THIS NOW:**

1. **Hard Refresh Browser**
   ```
   Press: Ctrl+Shift+R (Windows)
   Or: Cmd+Shift+R (Mac)
   ```

2. **Verify Port**
   ```
   Check URL bar: should show :3001
   Check terminal: should show port 3001
   ```

3. **Create NEW Invitation**
   ```
   Click "Autofill"
   Click "Generate Invitation"
   ```

4. **Test URL First**
   ```
   Copy invitation ID
   Test: http://192.168.0.111:3001/tukconnect-v2/verify-visitor/{id}
   Should show visitor details
   ```

5. **Scan QR Code**
   ```
   If URL test works, QR will work
   Scan with phone
   ✅ Should show visitor details!
   ```

---

**Try this now and let me know if the QR code opens with port 3001!** 🚀
