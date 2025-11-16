// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfills for Firebase/Auth in Jest (Node) environment
// Some Firebase dependencies expect Web TextEncoder/TextDecoder
try {
	const { TextEncoder, TextDecoder } = require('util');
	if (typeof global.TextEncoder === 'undefined') {
		global.TextEncoder = TextEncoder;
	}
	if (typeof global.TextDecoder === 'undefined') {
		global.TextDecoder = TextDecoder;
	}
	// Polyfill WHATWG streams used by undici/fetch inside Firebase Auth
	const webStreams = require('stream/web');
	if (typeof global.ReadableStream === 'undefined' && webStreams?.ReadableStream) {
		global.ReadableStream = webStreams.ReadableStream;
	}
	if (typeof global.WritableStream === 'undefined' && webStreams?.WritableStream) {
		global.WritableStream = webStreams.WritableStream;
	}
	if (typeof global.TransformStream === 'undefined' && webStreams?.TransformStream) {
		global.TransformStream = webStreams.TransformStream;
	}
} catch (e) {
	// If util is unavailable for some reason, ignore – tests that need it will fail explicitly
}
