module.exports = {
    contextSeparator: '_',
    // Key separator used in your translation  keys
    keySeparator: '.',
    // Namespace separator used in your translation keys
    // If you want to use namespaces, set this to :
    namespaceSeparator: ':',
    defaultValue: (locale, namespace, key, value) => {
        if (locale === 'en') {
            return value || key;
        }
        return '__NOT_TRANSLATED__';
    },
    // Indentation of the output files
    indentation: 4,
    // Keep keys from the source file
    keepRemoved: true,
    // Lexers configuration
    lexers: {
        ts: ['JavascriptLexer'],
        tsx: ['JsxLexer'],
        js: ['JavascriptLexer'],
        jsx: ['JsxLexer'],
        default: ['JavascriptLexer']
    },
    // Control the output file.
    // We use the locales directory in lib
    output: 'lib/locales/$LOCALE.json',
    // An array of the locales in your applications
    locales: ['en', 'pt', 'es'],
    // Scan all files in the current directory
    input: [
        'components/**/*.{js,jsx,ts,tsx}',
        'app/**/*.{js,jsx,ts,tsx}',
        'App.tsx',
        'index.tsx'
    ],
    sort: true,
    useKeysAsDefaultValue: true,
    verbose: false,
    failOnWarnings: false,
    customValueTemplate: null,
    resetDefaultValueHelp: false,
};
