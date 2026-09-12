/**
 * Tool definitions for document reading and inspection.
 */

const DOCUMENT_TOOLS = [
  {
    name: 'read_document',
    description: 'Read and retrieve the extracted data and text from the source document.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'extract_document_fields',
    description: 'Inspect specific normalized categories or fields from the source document.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['student', 'parent', 'address', 'all'],
          description: 'The section of document data to inspect',
        },
      },
    },
  },
];

module.exports = { DOCUMENT_TOOLS };
